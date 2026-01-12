#!/bin/bash

# SoFi-QA - Run Both Backend and Frontend
# This script starts both the FastAPI backend and the React frontend

set -e

# Colors for output
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ⚡ SoFi-QA - Synthetic Q&A Generator                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# PREREQUISITE CHECKS
# ============================================================

echo -e "${CYAN}🔍 Checking prerequisites...${NC}"

# Check for Python (prefer 3.11+, fallback to system python3)
PYTHON_CMD=""
if command -v python3.11 &>/dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3.12 &>/dev/null; then
    PYTHON_CMD="python3.12"
elif command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}❌ Python is not installed!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Python 3.10 or newer:${NC}"
    echo ""
    echo "  🍎 Mac:     brew install python@3.12"
    echo "             or download from https://www.python.org/downloads/"
    echo ""
    echo "  🐧 Linux:   sudo apt install python3 python3-pip python3-venv"
    echo "             or: sudo dnf install python3 python3-pip"
    echo ""
    echo "  🪟 Windows: https://www.python.org/downloads/"
    echo ""
    exit 1
fi

# Check Python version (need 3.10+)
PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$($PYTHON_CMD -c 'import sys; print(sys.version_info.major)')
PYTHON_MINOR=$($PYTHON_CMD -c 'import sys; print(sys.version_info.minor)')

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]); then
    echo -e "${RED}❌ Python version $PYTHON_VERSION is too old!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Python 3.10 or newer:${NC}"
    echo ""
    echo "  🍎 Mac:     brew install python@3.12"
    echo "             or download from https://www.python.org/downloads/"
    echo ""
    echo "  🐧 Linux:   sudo apt install python3.12 python3.12-venv"
    echo ""
    echo "  🪟 Windows: https://www.python.org/downloads/"
    echo ""
    exit 1
fi

echo -e "   ${GREEN}✓${NC} Python $PYTHON_VERSION found"

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Node.js (LTS version recommended):${NC}"
    echo ""
    echo "  🍎 Mac:     brew install node"
    echo "             or download from https://nodejs.org/"
    echo ""
    echo "  🐧 Linux:   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "             sudo apt install -y nodejs"
    echo ""
    echo "  🪟 Windows: https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "   ${GREEN}✓${NC} Node.js $NODE_VERSION found"

# Check for npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    echo ""
    echo -e "${YELLOW}npm usually comes with Node.js. Please reinstall Node.js:${NC}"
    echo "  https://nodejs.org/"
    echo ""
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "   ${GREEN}✓${NC} npm $NPM_VERSION found"

echo -e "${GREEN}✅ All prerequisites met!${NC}"
echo ""

# ============================================================
# SETUP AND RUN
# ============================================================

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    $PYTHON_CMD -m venv "$SCRIPT_DIR/.venv"
fi

# Activate virtual environment (OS aware)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows
    if [ -f "$SCRIPT_DIR/.venv/Scripts/activate" ]; then
        source "$SCRIPT_DIR/.venv/Scripts/activate"
    else
        source "$SCRIPT_DIR/.venv/bin/activate"
    fi
else
    # Linux/Mac
    source "$SCRIPT_DIR/.venv/bin/activate"
fi

# Check if deepeval is installed, if not install all requirements
echo -e "${CYAN}📦 Checking Python dependencies...${NC}"
if ! python -c "import deepeval" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  DeepEval not found. Installing all dependencies...${NC}"
    pip install --upgrade pip -q
    pip install -r "$SCRIPT_DIR/requirements.txt"
    echo -e "${GREEN}✅ All Python packages installed${NC}"
else
    echo -e "   ${GREEN}✓${NC} DeepEval found"
    # Quick install to ensure all packages are up to date (quiet mode)
    pip install -r "$SCRIPT_DIR/requirements.txt" -q
    echo -e "   ${GREEN}✓${NC} Dependencies up to date"
fi

# Check if node_modules exists in frontend
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Node modules not found. Installing frontend dependencies...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm install
    cd "$SCRIPT_DIR"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ All servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${CYAN}🚀 Starting Backend (FastAPI on port 8000)...${NC}"
cd "$SCRIPT_DIR"
uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start Frontend
echo -e "${CYAN}🚀 Starting Frontend (Vite on port 5173)...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo -e "   ${CYAN}Frontend:${NC} http://localhost:5173"
echo -e "   ${CYAN}Backend:${NC}  http://localhost:8000"
echo -e "   ${CYAN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
