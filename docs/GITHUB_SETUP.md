# SmartPrint – GitHub Setup & Push Guide

This guide provides simple instructions for linking your local SmartPrint repository to your personal GitHub account and pushing your code securely.

---

## Prerequisites
- A GitHub account ([github.com](https://github.com))
- Git installed on your computer (already verified: `git version 2.56.0`)

---

## Step 1: Create a New Repository on GitHub

1. Open your browser and go to [github.com/new](https://github.com/new).
2. Set **Repository name**: `smartprint` (or `print2print`).
3. Set **Description**: `SmartPrint – QR-Based Multi-Tenant Cloud Printing & Document Management Platform`.
4. Choose **Public** (or **Private** based on your preference).
5. **IMPORTANT:** Under "Initialize this repository with":
   - **Do NOT** check "Add a README file"
   - **Do NOT** check "Add .gitignore"
   - **Do NOT** choose a license
   *(We already have configured these locally).*
6. Click **Create repository**.

---

## Step 2: Copy Your GitHub Repository URL

After creating the repository, GitHub will show you the repository URL:
- **HTTPS:** `https://github.com/<YOUR_GITHUB_USERNAME>/smartprint.git`

---

## Step 3: Link and Push from Your Terminal

Open PowerShell or Command Prompt in `c:\Users\achud\OneDrive\Desktop\print2print` and run:

```bash
# 1. Add your GitHub repository as the origin remote
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/smartprint.git

# 2. Ensure your default branch is named main
git branch -M main

# 3. Push your committed code to GitHub
git push -u origin main
```

*(When prompted by Windows/GitHub, sign in via browser or personal access token to authorize the upload).*

---

## Step 4: Verify on GitHub
Once the push completes:
1. Refresh your GitHub repository page.
2. Verify that your frontend, backend, database, documentation, and print agent appear with your initial commit message.
3. Verify that your `.env` and uploaded files (`uploads/`, `data/`) are **NOT** visible on GitHub.
