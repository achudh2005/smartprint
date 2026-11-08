"""
SmartPrint Windows Print Agent - Automated Self-Test
Verifies configuration loading, printer enumeration, mock job submission,
and local spool hygiene without paper waste.
"""
import sys
import os
import unittest
from pathlib import Path

from config import load_config
from printer_service import WindowsPrinterService

class TestPrintAgent(unittest.TestCase):
    def setUp(self):
        self.config = load_config()
        self.printer_svc = WindowsPrinterService(enable_physical_spooling=False)

    def test_config_loaded(self):
        self.assertIn("server_url", self.config)
        self.assertIn("shop_code", self.config)
        self.assertIn("agent_token", self.config)
        self.assertTrue(Path(self.config["download_dir"]).exists())

    def test_printer_enumeration(self):
        printers = self.printer_svc.get_installed_printers()
        self.assertIsInstance(printers, list)
        self.assertGreater(len(printers), 0, "Should discover at least one Windows/virtual printer")
        first = printers[0]
        self.assertIn("name", first)
        self.assertIn("model", first)
        self.assertIn("connectionType", first)
        print(f"[TEST PASS] Discovered {len(printers)} printer(s). First: '{first['name']}'")

    def test_simulated_print_spooling(self):
        # Create dummy test file
        test_file = Path(self.config["download_dir"]) / "unit_test_doc.txt"
        test_file.write_text("SmartPrint Unit Test Document", encoding="utf-8")

        success, status, msg = self.printer_svc.submit_print_job(
            printer_name="Microsoft Print to PDF",
            file_path=str(test_file),
            job_ticket={"copies": 1}
        )

        self.assertTrue(success)
        self.assertEqual(status, "DRIVER_COMPLETED")
        self.assertIn("Simulated", msg)

        # Clean up
        if test_file.exists():
            test_file.unlink()
        print("[TEST PASS] Simulated print job submission and driver confirmation verified.")

if __name__ == "__main__":
    unittest.main()
