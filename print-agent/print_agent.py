"""
SmartPrint Windows Print Agent - Main Application Daemon
Automates unattended direct printing for SmartPrint multi-tenant shops.

Usage:
  python print_agent.py [--simulate] [--once]
"""
import sys
import os
import time
import signal
import logging
import argparse
from pathlib import Path

from config import load_config
from api_client import SmartPrintApiClient
from printer_service import WindowsPrinterService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("PrintAgent")

class SmartPrintAgent:
    def __init__(self, config, simulate=False):
        self.config = config
        self.running = True
        self.simulate = simulate or not config.get("enable_physical_spooling", False)
        
        self.api = SmartPrintApiClient(
            server_url=config["server_url"],
            shop_code=config["shop_code"],
            agent_token=config["agent_token"]
        )
        self.printer_svc = WindowsPrinterService(
            enable_physical_spooling=not self.simulate
        )
        
        # Local idempotency cache to prevent duplicate printing of same job
        self.processed_jobs = set()
        self.download_dir = Path(config["download_dir"])

    def start(self, run_once=False):
        logger.info("==================================================")
        logger.info("   SmartPrint Windows Print Agent v1.0.0")
        logger.info(f"   Target Shop: {self.config['shop_code']}")
        logger.info(f"   Server: {self.config['server_url']}")
        logger.info(f"   Mode: {'SIMULATION (Dry-Run)' if self.simulate else 'PHYSICAL SPOOLER'}")
        logger.info("==================================================")

        # 1. Authenticate with backend
        authenticated, info = self.api.authenticate()
        if not authenticated:
            logger.error(f"Agent startup aborted: {info}")
            return False

        # 2. Enumerate & Sync Local Windows Printers
        if self.config.get("auto_discover_printers", True):
            printers = self.printer_svc.get_installed_printers()
            logger.info(f"Discovered {len(printers)} Windows printer(s). Syncing...")
            self.api.sync_printers(printers)

        # 3. Main Polling Loop
        logger.info(f"Starting job polling loop (Interval: {self.config['poll_interval_seconds']}s)...")
        
        try:
            while self.running:
                self.process_pending_jobs()
                if run_once:
                    break
                time.sleep(self.config["poll_interval_seconds"])
        except KeyboardInterrupt:
            logger.info("Agent received shutdown signal. Exiting gracefully...")
        finally:
            self.cleanup()

        return True

    def process_pending_jobs(self):
        """
        Poll and execute pending print jobs with lifecycle progression
        """
        jobs = self.api.get_pending_jobs()
        if not jobs:
            return

        logger.info(f"Received {len(jobs)} pending print job(s).")

        for job in jobs:
            job_id = job["id"]

            # Idempotency check: prevent duplicate execution
            if job_id in self.processed_jobs:
                continue

            self.processed_jobs.add(job_id)
            self.execute_single_job(job)

    def execute_single_job(self, job):
        job_id = job["id"]
        file_name = job.get("fileName", f"job_{job_id}.bin")
        target_printer = job.get("printerName")
        job_ticket = job.get("jobTicket", {})

        logger.info(f"--- Processing Job #{job_id} ({file_name}) for Printer '{target_printer}' ---")

        # Destination download path
        spool_path = self.download_dir / f"job_{job_id}_{file_name}"

        # 1. DOWNLOAD PHASE
        download_success, err = self.api.download_job_file(job_id, str(spool_path))
        if not download_success:
            logger.error(f"Download phase failed for Job #{job_id}: {err}")
            self.api.update_job_status(job_id, "FAILED", error_message=err)
            return

        self.api.update_job_status(job_id, "DOWNLOADED", agent_notes="Document downloaded into local print spooler.")

        # 2. SUBMISSION TO OS SPOOLER PHASE
        self.api.update_job_status(job_id, "SUBMITTED_TO_OS", agent_notes=f"Sent to OS driver queue '{target_printer}'")

        # 3. DRIVER CONFIRMATION / PHYSICAL PRINT PHASE
        success, final_status, message = self.printer_svc.submit_print_job(
            printer_name=target_printer,
            file_path=str(spool_path),
            job_ticket=job_ticket
        )

        if success:
            logger.info(f"Job #{job_id} successfully printed on '{target_printer}'")
            self.api.update_job_status(job_id, final_status, agent_notes=message)
        else:
            logger.error(f"Print spooler failed for Job #{job_id}: {message}")
            self.api.update_job_status(job_id, "FAILED", error_message=message)

        # 4. CLEANUP LOCAL SPOOL FILE (Zero-trust privacy: do not leave customer files on agent disk)
        try:
            if spool_path.exists():
                spool_path.unlink()
                logger.info(f"Securely wiped local spool copy for Job #{job_id}")
        except Exception as e:
            logger.warning(f"Could not delete temporary spool file: {e}")

    def cleanup(self):
        logger.info("Cleaning up temporary spool directory...")
        for p in self.download_dir.glob("job_*"):
            try:
                p.unlink()
            except Exception:
                pass
        logger.info("Print Agent shut down cleanly.")

    def stop(self):
        self.running = False

def main():
    parser = argparse.ArgumentParser(description="SmartPrint Windows Print Agent")
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode without wasting paper")
    parser.add_argument("--once", action="store_true", help="Poll once and exit (for automated testing)")
    args = parser.parse_args()

    config = load_config()
    agent = SmartPrintAgent(config, simulate=args.simulate)

    # Register OS signals
    def sig_handler(sig, frame):
        agent.stop()
    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    agent.start(run_once=args.once)

if __name__ == "__main__":
    main()
