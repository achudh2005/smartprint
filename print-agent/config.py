"""
SmartPrint Windows Print Agent - Configuration Loader
Loads operational parameters from agent_config.json or environment variables.
"""
import os
import json
import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "agent_config.json"

DEFAULT_CONFIG = {
    "server_url": "http://localhost:5000",
    "shop_code": "SP-DEMO-001",
    "agent_token": "spa_demo_token_1234567890abcdef",
    "poll_interval_seconds": 4,
    "download_dir": str(BASE_DIR / "temp_spool"),
    "auto_discover_printers": True,
    "enable_physical_spooling": False,  # If False, runs in safe simulation mode (no wasted paper)
    "log_level": "INFO"
}

def load_config():
    config = DEFAULT_CONFIG.copy()

    # Load from agent_config.json if exists
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                user_conf = json.load(f)
                config.update(user_conf)
        except Exception as e:
            logging.warning(f"Failed to read {CONFIG_FILE}: {e}. Using defaults.")

    # Environment variables override config file
    config["server_url"] = os.getenv("SMARTPRINT_SERVER_URL", config["server_url"]).rstrip("/")
    config["shop_code"] = os.getenv("SMARTPRINT_SHOP_CODE", config["shop_code"]).strip().upper()
    config["agent_token"] = os.getenv("SMARTPRINT_AGENT_TOKEN", config["agent_token"]).strip()
    if os.getenv("SMARTPRINT_POLL_INTERVAL"):
        try:
            config["poll_interval_seconds"] = int(os.getenv("SMARTPRINT_POLL_INTERVAL"))
        except ValueError:
            pass

    # Ensure download spool directory exists
    download_dir = Path(config["download_dir"])
    download_dir.mkdir(parents=True, exist_ok=True)
    config["download_dir"] = str(download_dir)

    return config
