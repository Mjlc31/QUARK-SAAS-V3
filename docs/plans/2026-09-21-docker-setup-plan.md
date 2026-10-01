# Docker & Scraper Infrastructure Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Install Docker on macOS, start the Docker daemon, deploy the Google Maps Scraper kit, and validate the Prospecting UI.

**Architecture:** Homebrew to install Docker Desktop. Shell commands to manage the daemon state. Docker CLI to bring up the scraper. Playwright for end-to-end testing of the frontend.

**Tech Stack:** macOS, Homebrew, Docker, Node.js (Playwright)

---

### Task 1: Install Docker Desktop

**Files:**
- Modify: None
- Run: `brew install --cask docker`

**Step 1: Run the Homebrew Installation**
Execute the brew installation. This downloads and places Docker in `/Applications`.

### Task 2: Launch Docker and Wait for Daemon

**Step 1: Open Docker Desktop**
Run `open /Applications/Docker.app`. 
*Note: This will likely trigger a macOS permission prompt for the user. The subagent must inform the user to accept the terms and provide system privileges if prompted.*

**Step 2: Wait for Docker Daemon**
Use a while loop or repeated `docker info` commands to wait until the daemon is accessible (exit code 0).

### Task 3: Deploy Google Maps Scraper

**Step 1: Run the Scraper Container**
Navigate to `scratch/google-maps-scraper-kit` and deploy it. Check its `README.md` or `docker-compose.yml` to see the exact run command. Usually `docker-compose up -d` or `docker build` then `run`.
Ensure it exposes port 8080.

### Task 4: Validate E2E with Playwright

**Step 1: Run Playwright**
Use the `browser` tool (or `npx @playwright/mcp@latest`) to navigate to `http://localhost:5173/prospeccao` and verify that the "Scraper indisponível" error message is no longer present.
