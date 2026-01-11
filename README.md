# ⚡ SoFi-QA

> **Synthetic Question-Answering Data Generator** powered by DeepEval.

SoFi-QA is a tool that helps you turn your documents (like PDFs or Word files) into high-quality Question & Answer datasets. It has a nice looking website that lets you control everything easily.

---

## ✨ Features

- **📄 File Manager**: Upload and organize your PDF and DOCX files.
- **🤖 Smart AI**: Creates **Q&A pairs** and **Conversations** automatically.
- **⚙️ Easy Settings**: Change how the AI thinks and writes with simple controls.
- **🖥️ Cool Design**: A modern, dark-themed dashboard that is easy to use.
- **💬 Chat View**: See your data look like real text messages (User vs Bot).
- **🔍 Check Context**: See exactly what part of your document the AI used.

---

## 🚀 How to Start

### What You Need First

- **Python** (version 3.10 or newer)
- **Node.js** (for the website part)
- **OpenAI API Key** (this is the password for the AI)

### Installation

1.  **Download the Code**
    ```bash
    git clone https://github.com/your-username/sofi-qa.git
    cd sofi-qa
    ```

2.  **Set Your Password (API Key)**
    Make sure you tell your computer your OpenAI password.
    *Mac/Linux*: `export OPENAI_API_KEY="sk-..."`
    *Windows*: `$env:OPENAI_API_KEY="sk-..."`

### ▶️ Running the App

We made it super easy to start. Just pick your computer type below:

**🍎 If you are on Mac or Linux:**
Type this in your terminal:
```bash
./run.sh
```

**🪟 If you are on Windows:**
Type this in PowerShell:
```powershell
./run.ps1
```

**What happens next?**
1. The computer creates a special folder for Python stuff (`.venv`).
2. It installs all the Python tools it needs.
3. It runs `npm install` to download **React**, **Vite**, and **Axios** (this builds the website).
4. It starts the **Backend server** (the brain).
5. It starts the **Frontend website** (what you see).
6. Open your browser to `http://localhost:5173` to start!

---

## 📂 Folders Explained

```text
sofi-qa/
├── data/                    # Where your files live
│   ├── source_docs/         # The PDFs you upload go here
│   ├── synthetic_data/      # The Q&A answers go here
│   └── generation_config.json # Stores your AI settings
├── frontend/                # The website folder
│   ├── src/
│   │   ├── App.tsx          # The main website code
│   │   └── index.css        # The colors and styles
├── src/                     # The brain folder (Python)
│   ├── api.py               # Connects the website to the brain
│   ├── synthesizer.py       # Where the AI magic happens
│   └── config.py            # Settings file
├── tests/                   # Test files for checking if things work
├── main.py                  # Run this to generate data without the website
├── requirements.txt         # List of Python tools we need
├── run.sh                   # Start button for Mac/Linux
└── run.ps1                  # Start button for Windows
```

---

## 🛠️ How to Use It

1.  **Upload Files**: Click the **Documents** tab and drag your files there.
2.  **Settings**: Go to **Configuration** if you want to change how the AI writes.
3.  **Start**: Go to **Synthesis** and click **Start Synthesis**. Watch the blue bar go!
4.  **See Results**:
    - Go to the **Data** tab.
    - Click **Single-Turn** for simple Q&A.
    - Click **Multi-Turn** for full conversations.
    - Click **View Context** to see where the answer came from.

---

## 🔧 Fixing Problems

-   **Won't Connect?** Make sure you don't have another program using port `8000`.
-   **Stuck at 0%?** Check if your API Key is correct and has money on it.
-   **Website looks weird?** Refresh the page (Cmd+Shift+R or Ctrl+Shift+R).

---

**Powered by [DeepEval](https://github.com/confident-ai/deepeval)**
