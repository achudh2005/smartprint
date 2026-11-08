# SmartPrint — AWS Cloud Infrastructure Specification

## 1. Cloud Provider & Target Region

* **Cloud Provider:** Amazon Web Services (AWS)
* **Region:** `ap-south-1` (Asia Pacific — Mumbai, India)
  * Low-latency for printing shops and mobile users across India (<30ms roundtrip).
  * Full Free Tier eligibility available for EC2 compute, EBS volumes, and data transfer.

---

## 2. Infrastructure Architecture & Component Sizing

```
                                      AWS CLOUD (ap-south-1)
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                        │
 │  Virtual Private Cloud (Default VPC: 172.31.0.0/16)                                    │
 │                                                                                        │
 │  Public Subnet (ap-south-1a / ap-south-1b)                                             │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │                                                                                  │  │
 │  │   Security Group: `smartprint-ec2-sg`                                            │  │
 │  │   ├─ Inbound Port 22  (SSH)         ── Restricted to Administrator IP             │  │
 │  │   ├─ Inbound Port 80  (HTTP)        ── 0.0.0.0/0 (Public Internet)               │  │
 │  │   ├─ Inbound Port 443 (HTTPS)       ── 0.0.0.0/0 (Public Internet)               │  │
 │  │   └─ Outbound All Traffic (0.0.0.0/0)                                            │  │
 │  │                                                                                  │  │
 │  │   EC2 Virtual Server (`smartprint-prod-server`)                                  │  │
 │  │   ├─ Instance Type: `t2.micro` or `t3.micro` (1 vCPU, 1 GB RAM)                  │  │
 │  │   │  └─ Free Tier: 750 hours/month (Eligible for 100% free operation)            │  │
 │  │   ├─ Operating System: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type            │  │
 │  │   ├─ Root Block Device: 30 GB gp3 / gp2 EBS Storage                              │  │
 │  │   │  └─ Free Tier: Up to 30 GB free storage                                      │  │
 │  │   ├─ Swap Memory: 1 GB Swap File (protects against OOM during compilation)       │  │
 │  │   ├─ Public IPv4 Address: Auto-assigned by AWS                                   │  │
 │  │   │                                                                              │  │
 │  │   ├─ Software Stack:                                                             │  │
 │  │   │  ├─ Nginx 1.24+ (Reverse Proxy, SSL, Static Delivery, WebSockets)            │  │
 │  │   │  ├─ Node.js 20 LTS + PM2 (Backend Process Manager on port 5000)              │  │
 │  │   │  └─ MySQL 8.0 (Local database listening only on 127.0.0.1:3306)              │  │
 │  │   │                                                                              │  │
 │  │   └─ Storage Layout:                                                             │  │
 │  │      ├─ `/home/ubuntu/smartprint/frontend/dist` (Static Web Application)         │  │
 │  │      ├─ `/home/ubuntu/smartprint/backend` (API & Socket.IO server)               │  │
 │  │      ├─ `/home/ubuntu/smartprint/uploads` (Private segregated customer files)     │  │
 │  │      └─ `/home/ubuntu/backups/mysql` (Automated compressed database dumps)       │  │
 │  │                                                                                  │  │
 │  └──────────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Network & Firewall Security Policy

1. **Inbound Access Control:**
   * **Port 80 (HTTP):** Open to `0.0.0.0/0` (Redirects to HTTPS or serves application).
   * **Port 443 (HTTPS):** Open to `0.0.0.0/0` (Secure SSL/TLS encrypted traffic).
   * **Port 22 (SSH):** Restricted to administrator IP (`<YOUR_IP>/32`) or secure bastion.
   * **Ports 3306 (MySQL) & 5000 (Node API):** **BLOCKED from external internet.** Only accessible through local loopback (`127.0.0.1`).
2. **OS Firewall (UFW):**
   * Configured via `scripts/setup-ec2.sh` to enforce default deny incoming policy.
