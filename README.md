# ⚡ SoFi-QA

> **Synthetic Question-Answering Data Generator** powered by DeepEval.

SoFi-QA is a powerful, production-ready tool designed to transform unstructured documents (PDFs, DOCX) into high-quality, synthetic Q&A datasets. It features a modern, responsive React frontend tailored for easy configuration and real-time monitoring of synthesis jobs.

---

## ✨ Features

- **📄 Document Management**: Upload, list, and manage PDF and DOCX source documents.
- **🤖 AI-Powered Synthesis**: Generate both **Single-Turn** (Q&A) and **Multi-Turn** (Conversational) data.
- **⚙️ Granular Configuration**: Fine-tune generation parameters like reasoning scripts, scenario descriptions, and evolution weights.
- **🖥️ Modern UI**: A "Cosmic Glass" themed interface with real-time logs, progress bars, and responsive design.
- **💬 Conversational Preview**: View generated data in a chat-like interface (User vs Bot) for easy validation.
- **🔍 Context Retrieval**: Inspect the exact source context chunks used to generate each Q&A pair.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & **npm**
- **OpenAI API Key** (or compatible LLM provider)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/sofi-qa.git
    cd sofi-qa
    ```

2.  **Environment Setup**
    Ensure you have your API key set:
    ```bash
    export OPENAI_API_KEY="sk-..."
    ```

### Running the Application

We provide convenient scripts to start both the Backend and Frontend simultaneously:

**Mac/Linux:**
```bash
./run.sh
```

**Windows (PowerShell):**
```powershell
./run.ps1
```

This script will:
1.  Create and activate a Python virtual environment (`.venv`).
2.  Install Python dependencies from `requirements.txt`.
3.  Install Frontend dependencies (if missing).
4.  Launch the **FastAPI Backend** on `http://localhost:8000`.
5.  Launch the **Vite Frontend** on `http://localhost:5173`.

---

## 📂 Project Structure

```text
sofi-qa/
├── data/                    # Persistent Data Storage
│   ├── source_docs/         # Uploaded documents (PDF/DOCX)
│   ├── synthetic_data/      # Generated JSON datasets
│   └── generation_config.json
├── frontend/                # React Application (Vite)
│   ├── src/
│   │   ├── App.tsx          # Main UI Component
│   │   └── index.css        # Global Styles (Cosmic Theme)
├── src/                     # Backend Logic
│   ├── api.py               # FastAPI Server Endpoints
│   ├── synthesizer.py       # DeepEval Wrapper & Logic
│   └── config.py            # LLM Configuration
├── scripts/                 # Utility Scripts
│   └── run_batch.py         # CLI Tool for Batch Generation
├── requirements.txt         # Python Dependencies
└── run.sh                   # Startup Script
```

---

## 🛠️ Usage Guide

1.  **Upload Documents**: Go to the **Documents** tab and upload your knowledge base files.
2.  **Configure**: Use the **Configuration** tab to set the `Task`, `Scenario`, and `Weights` for your synthesis.
3.  **Generate**: Head to **Synthesis**, click **Start Synthesis**, and watch the logs in real-time.
4.  **Review Data**:
    - Open the **Data** tab to browse generated datasets.
    - Toggle between **Single-Turn** and **Multi-Turn**.
    - View results in a beautiful **Conversational Interface** (User Left / Bot Right).
    - Expand **View Context** to verify source accuracy.

---

## 🔧 Troubleshooting

-   **Backend not connecting?** Ensure port `8000` is free. Check logs in the terminal where `./run.sh` is running.
-   **Synthesis stuck?** Verify your `OPENAI_API_KEY` is valid and has sufficient credits.
-   **UI Glitches?** Hard refresh the page (`Cmd+Shift+R`) to clear cache often during development.

---

**Powered by [DeepEval](https://github.com/confident-ai/deepeval)**
