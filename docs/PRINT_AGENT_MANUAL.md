# SmartPrint Windows Print Agent Manual

The **SmartPrint Windows Print Agent** is a standalone, lightweight Python daemon designed to run on the printing shop owner's Windows computer. It connects the cloud-based SmartPrint application to local physical printers via the native Windows Print Spooler.

---

## 1. Architecture & Security Design

```mermaid
flowchart LR
    subgraph CloudBackend["SmartPrint Cloud Backend"]
        JobQueue["Job Dispatcher (/api/v1/agent)"]
    end

    subgraph WindowsClient["Shop PC (Windows 10 / 11 / Server)"]
        PrintAgent["print_agent.py Daemon"]
        LocalCache["Memory Idempotency Cache"]
        TempSpool["Ephemeral Spool Buffer (.tmp)"]
    end

    subgraph WindowsOS["Windows Operating System"]
        WinSpooler["Windows Spooler (win32print)"]
        PrinterDriver["Native Printer Drivers (HP/Canon/Epson)"]
        Hardware["Physical Laser / Inkjet Printers"]
    end

    JobQueue -->|1. Poll Pending Jobs (HTTPS)| PrintAgent
    PrintAgent -->|2. Stream Document via Temp URL| TempSpool
    PrintAgent -->|3. Check Idempotency| LocalCache
    PrintAgent -->|4. Win32 ShellExecute / win32print| WinSpooler
    WinSpooler --> PrinterDriver --> Hardware
    PrintAgent -->|5. Wipe File Immediately (Unlink)| TempSpool
    PrintAgent -->|6. Report Lifecycle Status| JobQueue
```

### Security & Privacy Guarantees
- **Zero-Trust Document Privacy**: The agent never stores printed files permanently. Documents are streamed into a temporary buffer and wiped immediately after submission to the Windows Spooler.
- **No Document Content Logging**: The agent logs job IDs, byte sizes, and driver completion codes, but never logs document contents or file previews.
- **Idempotency Protection**: A local in-memory execution cache prevents duplicate print jobs in case of network drops or server restarts.

---

## 2. Installation & Prerequisites

### 2.1 Requirements
- Windows 10, Windows 11, or Windows Server 2016+
- Python 3.10 or higher
- Network access to the SmartPrint backend server (HTTPS port 443 or HTTP port 5000 in development)
- Installed printer drivers for all connected USB/Network printers

### 2.2 Setup Instructions
1. Open PowerShell or Command Prompt on the Windows shop computer.
2. Navigate to the `print-agent` directory:
   ```cmd
   cd C:\path\to\print2print\print-agent
   ```
3. Create a dedicated virtual environment:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```
4. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
   *Required packages:* `requests`, `python-dotenv`, `pywin32`.

---

## 3. Configuration

Create or edit `agent_config.json` in the `print-agent/` directory:

```json
{
  "server_url": "https://your-smartprint-server.com",
  "shop_code": "CPHUB1",
  "agent_token": "your_64_character_agent_token_here",
  "poll_interval_seconds": 3,
  "heartbeat_interval_seconds": 30,
  "mock_printing": false,
  "log_level": "INFO"
}
```

### Configuration Parameters
| Parameter | Description | Default |
|-----------|-------------|---------|
| `server_url` | Full base URL of the SmartPrint API | `http://localhost:5000` |
| `shop_code` | Unique shop code from your dashboard | Required |
| `agent_token` | High-entropy machine token generated in Shop -> Printers | Required |
| `poll_interval_seconds` | Frequency in seconds to check for new direct print jobs | `3` |
| `heartbeat_interval_seconds` | Frequency to sync connected printers and report heartbeat | `30` |
| `mock_printing` | When `true`, simulates printing without wasting physical paper | `false` |
| `log_level` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | `INFO` |

Alternatively, parameters can be supplied via environment variables (`SMARTPRINT_SERVER_URL`, `SMARTPRINT_SHOP_CODE`, `SMARTPRINT_AGENT_TOKEN`).

---

## 4. Running the Agent

### 4.1 Foreground Mode (Testing & Verification)
```cmd
venv\Scripts\activate
python print_agent.py
```

Console Output Example:
```text
2026-11-07 22:05:00 [INFO] SmartPrint Windows Print Agent v1.0.0 starting...
2026-11-07 22:05:01 [INFO] Successfully authenticated with SmartPrint Backend for Shop #3 (CPHUB1)
2026-11-07 22:05:01 [INFO] Discovered 2 Windows printers: HP LaserJet Pro M404dn (Default), Canon C3530i
2026-11-07 22:05:01 [INFO] Synchronized printer capabilities to cloud backend.
2026-11-07 22:05:04 [INFO] Polling pending jobs... (0 pending)
```

### 4.2 Running as a Windows Background Service
To run the agent automatically upon Windows startup without requiring an active terminal window:
1. Use Windows Task Scheduler or NSSM (Non-Sucking Service Manager).
2. Install service with NSSM:
   ```cmd
   nssm.exe install SmartPrintAgent "C:\path\to\print2print\print-agent\venv\Scripts\python.exe" "C:\path\to\print2print\print-agent\print_agent.py"
   nssm.exe set SmartPrintAgent AppDirectory "C:\path\to\print2print\print-agent"
   nssm.exe start SmartPrintAgent
   ```

---

## 5. Troubleshooting & Diagnostics

### Problem: Agent authentication failed (HTTP 401)
- Verify that `shop_code` is uppercase and matches exactly.
- Regenerate a new Agent Token in the Shop Owner Dashboard under `/shops/:shopId/printers` and update `agent_config.json`.

### Problem: Printer shows Offline in dashboard
- Check USB or network cable to physical printer.
- Ensure the printer status in Windows Settings -> "Printers & Scanners" is "Ready".
- The agent updates printer status during heartbeat cycles every 30 seconds.

### Problem: Driver error or paper jam
- The agent intercepts Win32 error codes and automatically flags the job as `FAILED` in the dashboard with the exact error message.
- Clear the paper jam on the physical machine, then click **"Retry"** in the dashboard to resubmit the job.
