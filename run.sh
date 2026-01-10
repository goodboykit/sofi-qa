#!/bin/bash

# SoFi-QA - Run Both Backend and Frontend
# This script starts both the FastAPI backend and the React frontend

set -e

# Colors for output
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ⚡ SoFi-QA - Synthetic Q&A Generator                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    
    # Check for python command
    if command -v python3 &>/dev/null; then
        PYTHON_CMD="python3"
    else
        PYTHON_CMD="python"
    fi
    
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

# Install requirements
pip install -r "$SCRIPT_DIR/requirements.txt"

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
