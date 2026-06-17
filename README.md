# BigQuery Release Pulse

An elegant, real-time tracking and sharing hub for Google Cloud BigQuery Release Notes. Built using a lightweight **Python Flask** backend and a premium, responsive **Vanilla HTML/JS/CSS** frontend.

---

## ✨ Features

*   **Real-Time Feed Integration:** Parses GCP's official BigQuery release notes XML feed dynamically.
*   **Granular Update Cards:** Extracts individual updates (Features, Announcements, Issues, Changes, and Deprecations) from single-day entries and displays them as standalone cards.
*   **Premium Glassmorphic Design:** Styled with a futuristic space-theme dark mode, interactive hover animations, responsive grids, and pulsing skeleton loader states.
*   **Interactive Search & Filters:** Filter updates by category type and search text in real-time. Custom category tabs display calculated update count badges.
*   **Share on X (Twitter):** Select any release note card to open a custom Tweet Composer modal. Pre-formats the tweet with hashtags, tracks the 280-character limit dynamically, and redirects to X's sharing intent.

---

## 📁 Project Structure

```text
agy-cli-projects/
│
├── app.py                  # Python Flask server (RSS feed parsing & API)
├── requirements.txt        # Python dependencies
├── .gitignore              # Files ignored by Git
│
├── templates/
│   └── index.html          # Main HTML5 UI structure
│
└── static/
    ├── css/
    │   └── styles.css      # Custom stylesheet (Glassmorphism & animations)
    └── js/
        └── app.js          # Main client-side state & interactive logic
```

---

## 🚀 Getting Started

### Prerequisites

*   Python 3.7 or higher installed on your machine.
*   `pip` (Python package installer).

### Installation

1.  **Clone or navigate to the project directory:**
    ```bash
    cd C:\Google Antigravity\agy-cli-projects
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Flask application:**
    ```bash
    python app.py
    ```

4.  **Access the application:**
    Open your favorite web browser and go to:
    👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛠️ How It Works

*   **Backend (`app.py`):** Fetches the XML feed. If the data is requested or cache is expired/empty, it processes the XML using Python's standard `xml.etree.ElementTree`, separating individual updates, cleaning the HTML, formatting text for Twitter sharing, and caching the results.
*   **Frontend (`app.js`):** Interacts with the backend via JSON API (`/api/release-notes`), calculates active update counts, filters cards based on search input or active tabs, and validates character counts in the tweet composer modal before sending the user to X.
