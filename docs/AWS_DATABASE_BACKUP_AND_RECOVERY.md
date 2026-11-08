# SmartPrint — AWS Database Backup & Disaster Recovery Protocol

**Database Engine:** MySQL 8.0 on Ubuntu 24.04 LTS (AWS EC2)  
**Storage Destination:** `/home/ubuntu/backups/mysql/`  
**Retention Policy:** 7 Days (automated rotation)

---

## 1. Automated Daily Backups

SmartPrint includes an automated, production-safe backup script (`scripts/backup-database.sh`):

* **Transaction Consistency:** Uses `--single-transaction --quick` to ensure zero database locking. Incoming print orders and customer uploads continue seamlessly during backups.
* **Gzip Compression:** Backups are piped through `gzip -9`, achieving a 90%+ compression ratio. A 100,000-order database compresses to under 10 MB.
* **Storage Footprint:** Fits comfortably inside the 30 GB EBS Free Tier volume.

### Setting Up the Daily Crontab:
To run the backup automatically every night at 2:00 AM:
```bash
# Open crontab editor
crontab -e

# Add this line at the bottom:
0 2 * * * /home/ubuntu/smartprint/scripts/backup-database.sh >> /home/ubuntu/backups/backup.log 2>&1
```

---

## 2. On-Demand Manual Backup

To create a manual backup immediately (e.g. before applying schema updates or code changes):
```bash
cd /home/ubuntu/smartprint
./scripts/backup-database.sh
```

---

## 3. Disaster Recovery & Database Restoration

To restore the database from a backup file:
```bash
cd /home/ubuntu/smartprint
./scripts/restore-database.sh /home/ubuntu/backups/mysql/smartprint_db_YYYYMMDD_HHMMSS.sql.gz
```
The script will prompt for explicit confirmation before decompressing and importing data into the `smartprint` database.
