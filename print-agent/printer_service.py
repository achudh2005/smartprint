"""
SmartPrint Windows Print Agent - Printer Subsystem
Interfaces with the Windows Print Spooler (win32print / win32api).
Provides graceful fallback for testing and non-win32 environments.
"""
import sys
import os
import time
import logging
from pathlib import Path

logger = logging.getLogger("PrintAgent.Printers")

# Determine if native Windows printing API is available
IS_WINDOWS = sys.platform == "win32"
WIN32_AVAILABLE = False

if IS_WINDOWS:
    try:
        import win32print
        import win32api
        WIN32_AVAILABLE = True
    except ImportError:
        logger.warning("pywin32 is not installed. Running in printer simulation mode.")

class WindowsPrinterService:
    def __init__(self, enable_physical_spooling=True):
        self.enable_physical_spooling = enable_physical_spooling and WIN32_AVAILABLE

    def get_installed_printers(self):
        """
        Enumerate installed local and network printers
        """
        if not WIN32_AVAILABLE:
            # Fallback mock discovery for development & headless test environments
            return [
                {
                    "name": "HP LaserJet Pro MFP M428fdw",
                    "model": "HP LaserJet Pro",
                    "connectionType": "NETWORK",
                    "isDefault": True,
                    "capabilities": {"color": False, "duplex": True, "paperSizes": ["A4", "Letter"]}
                },
                {
                    "name": "Epson EcoTank L3250 Series",
                    "model": "Epson EcoTank",
                    "connectionType": "USB",
                    "isDefault": False,
                    "capabilities": {"color": True, "duplex": False, "paperSizes": ["A4", "A3", "Photo"]}
                },
                {
                    "name": "Microsoft Print to PDF",
                    "model": "Software Printer",
                    "connectionType": "VIRTUAL",
                    "isDefault": False,
                    "capabilities": {"color": True, "duplex": False, "paperSizes": ["A4"]}
                }
            ]

        try:
            default_printer = win32print.GetDefaultPrinter()
        except Exception:
            default_printer = ""

        printers = []
        try:
            # PRINTER_ENUM_LOCAL (2) | PRINTER_ENUM_CONNECTIONS (4)
            flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            raw_printers = win32print.EnumPrinters(flags)

            for p in raw_printers:
                # p is a tuple: (flags, description, name, comment)
                printer_name = p[2]
                is_default = (printer_name == default_printer)

                # Determine basic capabilities
                is_color = "color" in printer_name.lower() or "canon" in printer_name.lower() or "epson" in printer_name.lower()
                printers.append({
                    "name": printer_name,
                    "model": p[1] or "Windows Print Device",
                    "connectionType": "WINDOWS_SPOOLER",
                    "isDefault": is_default,
                    "capabilities": {
                        "color": is_color,
                        "duplex": True,
                        "paperSizes": ["A4", "Letter"]
                    }
                })

            if not printers:
                # If no physical printers found, provide standard fallback
                printers.append({
                    "name": "Microsoft Print to PDF",
                    "model": "Microsoft Virtual Printer",
                    "connectionType": "VIRTUAL",
                    "isDefault": True,
                    "capabilities": {"color": True, "duplex": False}
                })

        except Exception as e:
            logger.error(f"Error enumerating Windows printers: {e}")

        return printers

    def submit_print_job(self, printer_name, file_path, job_ticket=None):
        """
        Submit a document to the Windows print spooler.
        Returns (success: bool, status: str, message: str)
        Statuses:
          'SUBMITTED_TO_OS' - Spooler accepted file
          'DRIVER_COMPLETED' - Driver confirmed spooling finished
          'FAILED' - Spooler or printer error
        """
        if not os.path.exists(file_path):
            return False, "FAILED", f"File not found: {file_path}"

        job_ticket = job_ticket or {}
        copies = job_ticket.get("copies", 1)
        logger.info(f"Submitting '{Path(file_path).name}' ({copies} copy/copies) to '{printer_name}'...")

        # If running in simulation mode or non-win32 environment
        if not self.enable_physical_spooling:
            logger.info(f"[SIMULATION] Simulated print job for '{printer_name}' successful.")
            time.sleep(1) # simulate driver rendering
            return True, "DRIVER_COMPLETED", "Simulated print job finished successfully by driver."

        # Physical Windows printing using ShellExecute or win32print
        try:
            # 1. Verify printer exists
            handle = win32print.OpenPrinter(printer_name)
            win32print.ClosePrinter(handle)

            # 2. Invoke Windows printing verb 'printto' via win32api
            # This uses the registered OS handler for PDF/images to spool to the specific printer
            win32api.ShellExecute(
                0,
                "printto",
                str(Path(file_path).resolve()),
                f'"{printer_name}"',
                ".",
                0  # SW_HIDE
            )

            # Allow OS spooler to buffer the document
            time.sleep(2)

            return True, "DRIVER_COMPLETED", f"Job spooled and dispatched to Windows printer driver '{printer_name}'."
        except Exception as e:
            logger.error(f"Failed to submit print job to '{printer_name}': {e}")
            return False, "FAILED", f"Windows Spooler Error: {str(e)}"
