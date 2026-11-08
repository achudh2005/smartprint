"""
SmartPrint Windows Print Agent - Backend REST API Client
Communicates securely with the SmartPrint server using shopCode and agentToken.
Never logs document contents or personal information.
"""
import requests
import logging
from pathlib import Path

logger = logging.getLogger("PrintAgent.API")

class SmartPrintApiClient:
    def __init__(self, server_url, shop_code, agent_token):
        self.server_url = server_url.rstrip("/")
        self.shop_code = shop_code
        self.agent_token = agent_token
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "SmartPrint-WindowsAgent/1.0",
            "Accept": "application/json"
        })

    def authenticate(self):
        """
        Verify agent token against the backend
        """
        url = f"{self.server_url}/api/v1/agent/auth"
        payload = {
            "shopCode": self.shop_code,
            "agentToken": self.agent_token
        }
        try:
            resp = self.session.post(url, json=payload, timeout=10)
            data = resp.json()
            if resp.status_code == 200 and data.get("success"):
                logger.info(f"Successfully authenticated with shop: {data['data'].get('shopName')} ({self.shop_code})")
                return True, data["data"]
            error_msg = data.get("message", f"HTTP {resp.status_code}")
            logger.error(f"Authentication failed: {error_msg}")
            return False, error_msg
        except Exception as e:
            logger.error(f"Cannot connect to server at {self.server_url}: {e}")
            return False, str(e)

    def sync_printers(self, printers_list):
        """
        Report installed Windows printers to the shop dashboard
        """
        url = f"{self.server_url}/api/v1/agent/printers/sync"
        payload = {
            "shopCode": self.shop_code,
            "agentToken": self.agent_token,
            "printers": printers_list
        }
        try:
            resp = self.session.post(url, json=payload, timeout=10)
            data = resp.json()
            if resp.status_code == 200 and data.get("success"):
                logger.info(f"Synced {len(printers_list)} local printer(s) with shop dashboard.")
                return True, data["data"]
            return False, data.get("message", "Sync error")
        except Exception as e:
            logger.error(f"Printer sync request failed: {e}")
            return False, str(e)

    def get_pending_jobs(self):
        """
        Fetch QUEUED print jobs dispatched to this shop
        """
        url = f"{self.server_url}/api/v1/agent/jobs/pending"
        params = {
            "shopCode": self.shop_code,
            "agentToken": self.agent_token
        }
        try:
            resp = self.session.get(url, params=params, timeout=10)
            data = resp.json()
            if resp.status_code == 200 and data.get("success"):
                return data["data"].get("jobs", [])
            return []
        except Exception as e:
            logger.warning(f"Error checking pending jobs: {e}")
            return []

    def update_job_status(self, job_id, status, error_message=None, agent_notes=None):
        """
        Report job lifecycle status:
        DOWNLOADED -> SUBMITTED_TO_OS -> DRIVER_COMPLETED | FAILED
        """
        url = f"{self.server_url}/api/v1/agent/jobs/{job_id}/status"
        payload = {
            "shopCode": self.shop_code,
            "agentToken": self.agent_token,
            "status": status,
            "errorMessage": error_message,
            "agentNotes": agent_notes
        }
        try:
            resp = self.session.patch(url, json=payload, timeout=10)
            data = resp.json()
            if resp.status_code == 200:
                logger.info(f"Updated Job #{job_id} status to '{status}'")
                return True
            logger.warning(f"Failed to update Job #{job_id} status: {data.get('message')}")
            return False
        except Exception as e:
            logger.error(f"Error reporting job status for #{job_id}: {e}")
            return False

    def download_job_file(self, job_id, download_path):
        """
        Securely stream customer document from backend to local spool cache
        """
        url = f"{self.server_url}/api/v1/agent/jobs/{job_id}/download"
        params = {
            "shopCode": self.shop_code,
            "agentToken": self.agent_token
        }
        try:
            with self.session.get(url, params=params, stream=True, timeout=30) as resp:
                if resp.status_code == 200:
                    with open(download_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    logger.info(f"Downloaded Job #{job_id} document ({Path(download_path).stat().st_size} bytes)")
                    return True, None
                elif resp.status_code == 410:
                    return False, "HTTP 410 Gone: Document expired before printing could begin."
                return False, f"Server returned HTTP {resp.status_code}"
        except Exception as e:
            logger.error(f"Download failed for Job #{job_id}: {e}")
            return False, str(e)
