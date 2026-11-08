# SmartPrint — AWS Cost Estimation & Budget Analysis

**Target Region:** `ap-south-1` (Mumbai, India)  
**Target Monthly Budget:** ₹0.00 (Free Tier)

---

## 1. AWS Free Tier Allocation vs. SmartPrint Architecture

For newly created AWS accounts (or accounts with active 12-month Free Tier benefits):

| Service | Free Tier Allowance | SmartPrint Consumption | Cost Under Free Tier | Post-Free Tier Cost (Per Month) |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon EC2** (`t2.micro` or `t3.micro`) | 750 hours/month | 1 instance 24/7 (720–744 hrs) | **₹0.00** | ~$7.45 / month (~₹620) |
| **Amazon EBS** (General Purpose gp3 SSD) | 30 GB/month | 30 GB Root Volume | **₹0.00** | ~$2.40 / month (~₹200) |
| **Public IPv4 Address** | 750 hours/month free (EC2 Free Tier) | 1 Public IPv4 address | **₹0.00** | ~$3.60 / month (~₹300) |
| **Data Transfer (Bandwidth Out)** | 100 GB/month free out to Internet | ~5–10 GB estimated for PDF files | **₹0.00** | ₹0.00 (within 100 GB) |
| **Nginx Web Server** | Free Open Source | High-performance reverse proxy | **₹0.00** | ₹0.00 |
| **Local MySQL 8.0** | Free Open Source | Co-located on EC2 instance | **₹0.00** | ₹0.00 (No RDS charge) |
| **SSL Certificate (Let's Encrypt)** | Free Automated | Automated via Certbot | **₹0.00** | ₹0.00 |
| **TOTAL ESTIMATED MONTHLY COST** | — | — | **₹0.00 / month** | **~₹1,120 / month** |

---

## 2. Cost Protection Best Practices

1. **Do NOT enable AWS RDS:** A separate managed MySQL instance on Amazon RDS costs $15–$25/month. SmartPrint runs local MySQL on the EC2 instance, saving 100% of RDS costs.
2. **Do NOT provision an AWS Application Load Balancer (ALB):** ALBs cost ~$18–$22/month. SmartPrint uses Nginx directly on EC2, saving 100% of ALB costs.
3. **Do NOT allocate an Elastic IP without attaching it:** An unattached Elastic IP incurs charges. The default auto-assigned public IPv4 address on the EC2 instance is included in the free tier.
4. **Set an AWS Billing Alert:** Configure a $1 budget alert in **AWS Budgets** to receive an immediate notification if any unexpected charge occurs.
