# ⏱️ Downtime Tracker

A robust, client-side web application designed to track and manage downtime at work. Built with a focus on simplicity, data persistence, and professional "Wire List" visual branding.

## ✨ Features

- **Punch Clock Interface:** Simple start/stop timer for tracking active downtime sessions.
- **Session Persistence:** Active timers survive page refreshes and browser restarts.
- **Local Storage:** Uses IndexedDB for high-capacity, long-term local data retention.
- **Custom Reasons:** Choose from predefined categories (Forklift, Machine, etc.) or save your own custom reasons.
- **Statistics Dashboard:** Real-time metrics for total records, total downtime duration, and database health.
- **Multi-Format Export:** Download your records as CSV, Markdown, or HTML files.
- **Data Management:** Search, sort, and batch-delete records.
- **Backup & Restore:** Export your entire database as a JSON file and import it back anytime.
- **Dark Mode:** Support for both light and dark visual themes.
- **Deployment Ready:** Automated deployment to GitHub Pages via GitHub Actions.

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari).

### Usage

1. **Start Tracking:** Select a reason from the dropdown and click **START TIMER**.
2. **Stop Tracking:** Click **STOP TIMER** when done. The record is automatically saved to the database.
3. **Manage Records:** Scroll down to the Record Management section to search, sort, or delete entries.
4. **Export Data:** Use the buttons in the Database Management section to export your history for reporting.
5. **Backup:** Regularly use the **BACKUP DATABASE** button to save a local copy of your entire history.

## 🛠️ Technology Stack

- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **Storage:** IndexedDB API for persistent client-side storage.
- **CI/CD:** GitHub Actions for automated static site deployment.

## 🎨 Visual Design

The application follows the "Wire List" visual language:
- **Primary Palette:** Professional Blue (#2563eb) and Signal Yellow (#facc15).
- **Typography:** Clean, sans-serif fonts for high readability.
- **Iconography:** Distinct "E" logo branding.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
