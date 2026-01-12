# ⚡ SoFi-QA

> **Synthetic Question-Answering Data Generator** powered by DeepEval.

SoFi-QA is a tool that helps you turn your documents (like PDFs or Word files) into high-quality Question & Answer datasets. It has a nice looking website that lets you control everything easily.

---

## ✨ Features

- **📄 File Manager**: Upload and organize your PDF and DOCX files.
- **🤖 Smart AI**: Creates **Q&A pairs** and **Conversations** automatically using **GPT-4o-mini**.
- **⚙️ Easy Settings**: Change how the AI thinks and writes with simple controls.
- **🖥️ Cool Design**: A modern, dark-themed dashboard that is easy to use.
- **💬 Chat View**: See your data look like real text messages (User vs Bot).
- **🔍 Check Context**: See exactly what part of your document the AI used.
- **🧪 Built-in Tests**: Run tests to check if the AI answers are good.

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

2.  **Set Your API Key**
    Create a file called `.env` in the main folder and put this inside:
    
    ```
    OPENAI_API_KEY=sk-your-openai-key-here
    ```
    You can get one at: https://platform.openai.com/api-keys

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
4. It starts the **Backend server** (the brain) on port `8000`.
5. It starts the **Frontend website** (what you see) on port `5173`.
6. Open your browser to `http://localhost:5173` to start!

---

## 📂 Folders Explained

```text
sofi-qa/
├── .env                     # Your secret API key lives here (do NOT share this!)
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
│   ├── processor.py         # Helper that talks to the AI model
│   └── config.py            # Loads your API key and AI settings
├── tests/                   # Test files for checking if things work
│   ├── __init__.py          # Makes this folder a Python package
│   └── test_evaluation.py   # Runs quality checks on generated data
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
5.  **Test Quality**: Go to **Evaluation** and click **Run Tests** to check if your data is good.

---

## 🧪 Evaluation (Quality Testing)

You can check if your generated Q&A is good in two ways:

### Option 1: Using the Website (Easy!)
1. Go to the **Evaluation** tab in the sidebar.
2. Click the green **Run Tests** button.
3. Watch the live output as tests run (just like a terminal!).
4. See the results with green ✓ for passed and red ✗ for failed.
5. Click **Stop** anytime if you want to cancel.

### Option 2: Using the Terminal
```bash
# Make sure you are in the project folder and venv is active
pytest tests/ -v
```

**What gets tested?**
- **Answer Relevancy**: Is the answer related to the question?
- **Faithfulness**: Is the answer true to the source document?
- **Conversation Quality**: Does the bot sound professional?

---

## 🔧 Fixing Problems

-   **Won't Connect?** Make sure you don't have another program using port `8000`.
-   **Stuck at 0%?** Check if your API Key is correct and has money on it.
-   **Website looks weird?** Refresh the page (Cmd+Shift+R or Ctrl+Shift+R).
-   **Tests failing?** Make sure you have data in `data/synthetic_data/` first.
-   **Evaluation won't start?** Generate data with Synthesis first before running tests.
-   **"0 out of 0 chunks" during synthesis?** This means the PDF text extraction failed. Reinstall the PDF libraries (see below).
-   **"No synthetic goldens found" error?** The document couldn't be processed. Check:
    - Your PDF contains actual text (not scanned images)
    - The PDF libraries are correctly installed
    - Try a different PDF to test
-   **PDF parsing issues?** The app uses a pinned combination of PDF libraries to avoid compatibility issues:
    - `pdfplumber==0.11.4`
    - `pdfminer.six==20231228`
    - `pypdf==4.2.0`
    - `pymupdf`
    
    If you see a `'bbox'` KeyError or synthesis fails, reinstall these packages:
    ```bash
    pip install pdfplumber==0.11.4 pdfminer.six==20231228 pypdf==4.2.0 pymupdf --force-reinstall
    ```

---

**Powered by [DeepEval](https://github.com/confident-ai/deepeval)**
