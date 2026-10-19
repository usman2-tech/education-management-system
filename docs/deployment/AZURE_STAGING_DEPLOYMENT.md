# Azure Cloud Staging Deployment Guide — Educational Management System (EMS)

> **Document Type:** Production Runbook & Staging Deployment Guide  
> **Target Cloud:** Microsoft Azure (Ubuntu Linux VM + Docker Compose)  
> **Release Target:** EMS v1.0.0 Stable Release (`main` branch)  
> **Status:** Deployment Preparation & Verification (Pre-Provisioning)  
> **Billing Model:** Pay-As-You-Go ($200 Promotional Credit Management)  

---

## 1. Prerequisites

Before starting the Azure staging deployment, ensure you have:
1. **Active Azure Account**: A valid subscription with promotional credits or Pay-As-You-Go enabled.
2. **Local Machine (Windows PowerShell)**:
   - `ssh` client (built into Windows 10/11 OpenSSH).
   - `git` client installed.
3. **Domain Name**:
   - A free domain or subdomain from Namecheap (e.g., via GitHub Student Developer Pack) or existing registrar.
   - Access to your domain's DNS management console to create `A` records.
4. **Google Gemini API Key**:
   - Obtained from [Google AI Studio](https://aistudio.google.com/) for activating live AI features.

---

## 2. Azure Subscription and Credit Verification

1. Navigate to the [Azure Portal](https://portal.azure.com/).
2. Search for **Subscriptions** in the top search bar.
3. Select your active subscription:
   - Note the **Subscription ID**.
   - Check **Status** (must be `Active`).
4. Select **Cost Management** > **Cost analysis** in the left sidebar:
   - Verify remaining promotional credit balance (e.g., ~$200).
   - Check credit expiration date.

---

## 3. Azure Region and VM Sizing Selection

### Recommended Architecture
A single, high-efficiency Azure Ubuntu Linux Virtual Machine running Docker Compose, hosting the 6 isolated application containers on internal bridge networks.

### Recommended VM SKU: `Standard_B2ms`
| Attribute | Specification | Rationale |
| :--- | :--- | :--- |
| **vCPUs** | 2 vCPUs | Sufficient for multi-process Node.js, Python FastAPI, and PostgreSQL |
| **RAM** | 8 GiB | Required to comfortably host Next.js, NestJS, Python, Postgres, and Redis simultaneously |
| **Disk Type** | Standard SSD (64 GiB, E6) | Cost-effective OS disk with low hourly baseline cost |
| **Architecture** | x86_64 (`linux/amd64`) | 100% compatible with project Dockerfiles |
| **OS Image** | Ubuntu Server 24.04 LTS Gen 2 | Long-term support, standard Docker Engine support |

### Regional Sizing & Pricing Comparison
*Prices estimated based on standard Azure East US rates (prices vary slightly by region):*

| SKU | vCPU | RAM | Hourly Rate | Estimated Monthly (24/7) | Testing Cost (20 Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard_B2ms (Recommended)** | 2 | 8 GiB | ~$0.0832 / hr | ~$60.74 / mo | **~$1.66** |
| **Standard_B2s** | 2 | 4 GiB | ~$0.0416 / hr | ~$30.37 / mo | ~$0.83 (Requires 4GB swap) |
| **Standard_D2s_v5** | 2 | 8 GiB | ~$0.0960 / hr | ~$70.08 / mo | ~$1.92 |
| **Standard_B4ms** | 4 | 16 GiB | ~$0.1660 / hr | ~$121.18 / mo | ~$3.32 |

> [!TIP]
> **Check Regional Quotas**: In the Azure Portal, search for **Quotas** > **Compute** to verify your subscription has quota for `Standard B-series` vCPUs in your chosen region (e.g., `eastus` or `centralus`).

---

## 4. Estimated Costs and Billing Risks

Even with a $200 credit, Azure accounts are **Pay-As-You-Go**. You must understand which components incur charges:

1. **Compute (VM)**: Billed only when the VM is **Running**. Drops to **$0.00/hour** when the VM is **Stopped (deallocated)**.
2. **Managed OS Disk (64 GB Standard SSD)**: Billed continuously at **~$4.80/month** until the disk resource is deleted.
3. **Standard Public IPv4 Address**: Billed at **~$0.005/hour (~$3.65/month)** while reserved.
4. **Bandwidth / Egress**: First **5 GB/month is free**; subsequent outbound transfer is ~$0.087/GB.

### Safe Staging Usage Strategy
- Running the VM for 15–20 hours of testing consumes approximately **$2.00–$3.00** of your $200 credit.
- Always **Deallocate** the VM when not actively testing.
- When staging is finished, delete the resource group to stop all disk and IP charges.

---

## 5. Azure Cost Management Budget Alerts

Set up automated email alerts before creating any virtual machine:

1. In Azure Portal, navigate to **Cost Management + Billing** > **Budgets**.
2. Click **+ Add**.
3. Configure the budget:
   - **Name**: `EMS-Staging-Budget`
   - **Scope**: Select your subscription or resource group.
   - **Reset Period**: Monthly.
   - **Budget Amount**: `$25.00`
4. Set Alert Conditions:
   - **Alert 1 (20%)**: `$5.00` actual spending -> Send email.
   - **Alert 2 (50%)**: `$12.50` actual spending -> Send email.
   - **Alert 3 (100%)**: `$25.00` actual spending -> Send email.
5. Provide your email address and click **Create**.

> [!WARNING]
> Budget alerts send email notifications; they **do not automatically shut down resources**. You must manually deallocate or delete resources if you exceed your testing window.

---

## 6. VM Creation Steps (Ubuntu Linux)

### Step 6.1: Create Resource Group
1. Search **Resource groups** > click **+ Create**.
2. **Resource group**: `rg-ems-staging`
3. **Region**: `East US` (or your preferred region with available B-series quota).
4. Click **Review + create** > **Create**.

### Step 6.2: Create Virtual Machine
1. Search **Virtual machines** > click **+ Create** > **Azure virtual machine**.
2. Configure **Basics**:
   - **Resource group**: `rg-ems-staging`
   - **Virtual machine name**: `vm-ems-staging`
   - **Region**: Same as resource group (e.g., `East US`).
   - **Availability options**: `No infrastructure redundancy required`.
   - **Security type**: `Standard`.
   - **Image**: `Ubuntu Server 24.04 LTS - x64 Gen2`.
   - **Size**: `Standard_B2ms` (2 vcpus, 8 GiB memory).
3. Configure **Administrator account**:
   - **Authentication type**: `SSH public key`.
   - **Username**: `azureuser`.
   - **SSH public key source**: `Generate new key pair` (or select existing).
   - **Key pair name**: `ems-staging-key`.
4. Configure **Inbound port rules**:
   - **Public inbound ports**: `Allow selected ports`.
   - **Select inbound ports**: Check `SSH (22)`, `HTTP (80)`, and `HTTPS (443)`.
5. Configure **Disks**:
   - **OS disk type**: `Standard SSD (locally-redundant storage)`.
   - **Size**: Change size to `64 GiB` (E6).
   - **Delete with VM**: Check `Delete OS disk with VM` (ensures disk is deleted if VM is destroyed).
6. Configure **Networking**:
   - **Public IP**: Create new (`vm-ems-staging-ip`, Standard SKU).
   - **Delete public IP and NIC when VM is deleted**: Check **Enable**.
7. Click **Review + create** > **Create**.
8. Download the private key file (`ems-staging-key.pem`) and save it securely on your Windows computer.

---

## 7. SSH Connection from Windows PowerShell

1. Open PowerShell on Windows.
2. Locate your saved key (e.g., in `C:\Users\hp\.ssh\ems-staging-key.pem`).
3. Set appropriate permissions on the key:
   ```powershell
   icacls "C:\Users\hp\.ssh\ems-staging-key.pem" /inheritance:r
   icacls "C:\Users\hp\.ssh\ems-staging-key.pem" /grant:r "$($env:USERNAME):(R)"
   ```
4. Connect to the Azure VM (substitute `<VM_PUBLIC_IP>` with the public IP from Azure Portal):
   ```powershell
   ssh -i "C:\Users\hp\.ssh\ems-staging-key.pem" azureuser@<VM_PUBLIC_IP>
   ```

---

## 8. Docker Engine & Docker Compose Installation on Ubuntu

Run these commands inside your SSH session on the Ubuntu VM:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Configure 4 GB Swap space (safety margin during Docker builds)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Install Docker prerequisites
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 4. Add Docker official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 5. Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 6. Install Docker Engine and Docker Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 7. Add azureuser to docker group (avoid sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# 8. Verify installation
docker --version
docker compose version
```

---

## 9. Repository Checkout & Release Selection

```bash
# Clone the EMS repository
git clone https://github.com/usman2-tech/education-management-system.git
cd education-management-system

# Ensure you are on the verified main branch
git checkout main
git pull origin main

# Confirm latest commit
git log -n 1 --oneline
```

---

## 10. Production/Staging Environment Variable Setup

Run the automated staging environment generator:

```bash
# Make helper scripts executable
chmod +x infrastructure/scripts/*.sh

# Run generator with your staging domain or Azure VM Public IP
./infrastructure/scripts/generate-staging-env.sh ems.yourdomain.com
```

Edit `.env` to supply your **Google Gemini API Key**:
```bash
nano .env
# Set: GEMINI_API_KEY=AIzaSy...
# Save with Ctrl+O, Enter, and exit with Ctrl+X
```

---

## 11. Domain & HTTPS Setup (Namecheap + Let's Encrypt)

### Step 11.1: Namecheap DNS Record
1. Log into your [Namecheap Dashboard](https://ap.www.namecheap.com/).
2. Go to **Domain List** > click **Manage** next to your domain.
3. Select **Advanced DNS** tab.
4. Under **Host Records**, click **Add New Record**:
   - **Type**: `A Record`
   - **Host**: `ems` (creates `ems.yourdomain.com`) or `@` (for root domain).
   - **Value**: `<AZURE_VM_PUBLIC_IP>` (e.g., `20.120.45.67`)
   - **TTL**: `Automatic` or `1 min`.
5. Wait 2–5 minutes for DNS propagation:
   ```bash
   ping ems.yourdomain.com
   ```

### Step 11.2: Verify Nginx Domain Configuration
The default Nginx configuration (`infrastructure/nginx/conf.d/default.conf`) is configured for `ems.eduportal.dev`. If you are using a different domain, update the server name and certificate paths:
```bash
sed -i 's/ems.eduportal.dev/YOUR_ACTUAL_DOMAIN/g' infrastructure/nginx/conf.d/default.conf
```

### Step 11.3: Bootstrap Let's Encrypt SSL
Run the automated SSL bootstrap script. This script creates a temporary self-signed certificate inside the persistent Docker named volume (`ems_prod_ssl_certs` mounted at `/etc/letsencrypt`), boots Nginx on port 80 to satisfy ACME challenges, requests a trusted Let's Encrypt certificate via Certbot, and reloads Nginx with zero downtime:
```bash
./infrastructure/scripts/init-letsencrypt.sh ems.eduportal.dev your-email@example.com
```

> [!NOTE]
> **Idempotent & Safe**: If trusted certificates already exist in the named volume, the script will skip certificate re-issuance to protect against Let's Encrypt rate limits. If Certbot fails (e.g. DNS propagation delay), the script automatically restores the fallback certificates so Nginx remains operational on HTTP/HTTPS.

### Step 11.4: Verify Certificate Renewal (Automated & Manual)
Automatic certificate renewal is built-in:
1. The `certbot` container checks every 12 hours for expiring certificates (`certbot renew --webroot -w /var/www/certbot`).
2. The `nginx` container runs a background graceful reload every 12 hours (`nginx -s reload`) to apply renewed certificates seamlessly.

To test certificate renewal manually at any time without waiting for expiry:
```bash
# Perform a dry-run renewal test
./infrastructure/scripts/renew-certificates.sh --dry-run

# Or perform an active renewal and reload
./infrastructure/scripts/renew-certificates.sh
```

---

## 12. Complete Application Deployment & Migration

Run the one-command deployment orchestrator:

```bash
# Deploy with synthetic test fixtures (schools, teachers, students, parents)
./infrastructure/scripts/deploy-staging.sh --seed
```

This automated script will:
1. Build all 5 multi-stage Docker containers.
2. Launch PostgreSQL 16 and Redis 7.
3. Await database readiness.
4. Execute `npx prisma migrate deploy` applying `20261017000000_init_ems_production`.
5. Seed synthetic demo records (`prisma/seed.ts`).
6. Launch NestJS API, Python AI Service, Next.js Web, and Nginx.

---

## 13. Application Health Checks

Verify all service containers are healthy:

```bash
# View container status
docker compose -f docker-compose.prod.yml ps

# Check API Health endpoint
curl -f https://YOUR_ACTUAL_DOMAIN/api/v1/health

# Check AI Service Health endpoint
curl -f https://YOUR_ACTUAL_DOMAIN/ai/health

# Check Frontend HTTP response
curl -I https://YOUR_ACTUAL_DOMAIN/
```

---

## 14. Five-Role Staging Test Accounts

Use these synthetic test credentials (seeded by `prisma/seed.ts`) to log into `https://YOUR_ACTUAL_DOMAIN`:

| Role | Email Address | Password | Intended Portal |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `platform.admin@ems.local` | `Password123!` | System Governance, School Onboarding |
| **School Administrator** | `admin.stjude@ems.local` | `Password123!` | Campus Operations, Faculty, Enrollment |
| **Teacher** | `sarah.jenkins@stjude.local` | `Password123!` | Gradebook, Attendance, AI Copilot |
| **Student** | `alex.turner@student.stjude.local` | `Password123!` | Homework, Assessments, AI Tutor |
| **Parent / Guardian** | `marcus.turner@parent.stjude.local`| `Password123!` | Guardian Monitor, Fees, Bus Tracking |

---

## 15. Real-Time Features & WebSocket Verification

1. **Direct Messaging & Notifications**:
   - Open two browser tabs: one logged in as Teacher (`sarah.jenkins@stjude.local`) and one as Parent (`marcus.turner@parent.stjude.local`).
   - Send an in-app message from Teacher to Parent.
   - Verify instant delivery over WebSocket (`/socket.io/`) without page refresh.
2. **Attendance Finalization Alerts**:
   - As Teacher, finalize attendance for a class section with an absent student.
   - Confirm automated absence notification arrives in Parent notifications.
3. **Transport GPS Tracking**:
   - Navigate to `/transport` as School Admin or Parent.
   - Verify WebSocket telemetry channel connects to `wss://YOUR_ACTUAL_DOMAIN/socket.io/`.

---

## 16. Logs and Troubleshooting

```bash
# View combined logs in real-time
docker compose -f docker-compose.prod.yml logs -f

# Inspect specific service logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f ai-service
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart a specific service
docker compose -f docker-compose.prod.yml restart api
```

---

## 17. Database Backups & Disaster Recovery

### Automated Backup
```bash
./infrastructure/scripts/backup-db.sh ./backups/postgres
```
Creates a compressed PostgreSQL dump: `./backups/postgres/ems_ems_database_YYYYMMDD_HHMMSS.dump`.

### Restore Backup
```bash
./infrastructure/scripts/restore-db.sh ./backups/postgres/ems_ems_database_YYYYMMDD_HHMMSS.dump
```

---

## 18. Updating the Deployed Application

When updates are committed to `main`:

```bash
cd ~/education-management-system
git pull origin main

# Rebuild and restart containers with zero database downtime
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

---

## 19. VM Deallocation (Pause Billing) & Resource Teardown

### Option A: Pause Compute Billing (Preserve Staging Data)
When you finish testing for the day:
1. In Azure Portal, go to **Virtual machines** > `vm-ems-staging`.
2. Click **Stop**.
3. Confirm the status changes to **Stopped (deallocated)**.
   *Compute charges drop to $0.00/hour. OS Disk ($4.80/mo) and IP ($3.65/mo) remain until deleted.*
4. To resume testing later, click **Start**.

### Option B: Complete Teardown (Stop 100% of Billing)
When staging testing is permanently finished:
```bash
# Run from your local PowerShell (Azure CLI) or in Azure Portal:
az group delete --name rg-ems-staging --yes --no-wait
```
*Deleting the resource group `rg-ems-staging` permanently deletes the VM, OS disk, public IP, and network interface, guaranteeing zero ongoing charges.*

---

## 20. Staging Approval Checklist (Before Cloud Provisioning)

- [ ] Azure subscription verified and budget alert configured at $25.00.
- [ ] Promotional credit balance verified.
- [ ] VM region selected with verified B-series quota.
- [ ] SSH key pair generated and backed up securely.
- [ ] Namecheap DNS access verified.
- [ ] Google Gemini API key obtained.
- [ ] Synthetic fixtures approved (no real institutional data copied to cloud).
- [ ] Teardown procedure reviewed to prevent accidental post-trial billing.
