"""
SoFi-QA Backend API
FastAPI server for document upload, synthesis, and goldens management.
"""

import os
import json
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.synthesizer import DatasetGenerator

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
SOURCE_DOCS_DIR = DATA_DIR / "source_docs"
SYNTHETIC_DATA_DIR = DATA_DIR / "synthetic_data"

# Ensure directories exist
SOURCE_DOCS_DIR.mkdir(parents=True, exist_ok=True)
SYNTHETIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Job tracking
synthesis_jobs = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown lifecycle."""
    print("🚀 SoFi-QA API starting...")
    yield
    print("👋 SoFi-QA API shutting down...")


app = FastAPI(
    title="SoFi-QA API",
    description="Synthetic QA Data Generation & Evaluation API",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles

# ... existing imports ...

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (documents)
app.mount("/files", StaticFiles(directory=SOURCE_DOCS_DIR), name="files")


# ============ Pydantic Models ============

class SynthesisRequest(BaseModel):
    document_ids: List[str]
    max_goldens_per_context: int = 2
    synthesis_type: str = "single"  # "single" or "multi"


class GoldenUpdate(BaseModel):
    input: Optional[str] = None
    expected_output: Optional[str] = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: int  # 0-100
    message: str
    result: Optional[dict] = None


class ConfigUpdate(BaseModel):
    task: str
    scenario: str
    input_format: str
    expected_output_format: str
    reasoning_weight: float
    multicontext_weight: float
    api_key: Optional[str] = None
    eval_metric_name: Optional[str] = "Professionalism & Accuracy"
    eval_metric_criteria: Optional[str] = "Does the bot maintain the Clark Safari persona and provide accurate info?"
    # Advanced
    model_name: Optional[str] = "gpt-4o-mini"
    num_evolutions: Optional[int] = 2
    num_goldens: Optional[int] = 2
    eval_threshold: Optional[float] = 0.7
    eval_timeout: Optional[int] = 60  # Timeout in seconds per test (saves API credits)
    max_user_simulations: Optional[int] = 2  # Number of conversation rounds for multi-turn tests


# ============ Config Endpoints ============

@app.get("/api/config")
async def get_config():
    """Get current generation configuration."""
    config_path = DATA_DIR / "generation_config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "task": "Expert Customer Support",
        "scenario": "A customer interacting with an automated assistant.",
        "input_format": "Professional and specific queries",
        "expected_output_format": "Detailed responses with citations",
        "reasoning_weight": 0.5,
        "multicontext_weight": 0.5,
        "api_key": "",
        "eval_metric_name": "Professionalism & Accuracy",
        "eval_metric_criteria": "Does the bot maintain the Clark Safari persona and provide accurate info?",
        "model_name": "gpt-4o-mini",
        "num_evolutions": 2,
        "num_goldens": 2,
        "eval_threshold": 0.7,
        "eval_timeout": 60,
        "max_user_simulations": 2
    }


@app.post("/api/config")
async def update_config(config: ConfigUpdate):
    """Update generation configuration."""
    config_path = DATA_DIR / "generation_config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config.dict(), f, indent=2)
    return {"message": "Configuration updated successfully"}

# ============ Document Endpoints ============

@app.get("/api/documents")
async def list_documents():
    """List all uploaded documents."""
    documents = []
    for file_path in SOURCE_DOCS_DIR.iterdir():
        if file_path.suffix.lower() in [".pdf", ".docx"]:
            stat = file_path.stat()
            documents.append({
                "id": file_path.stem,
                "name": file_path.name,
                "size": stat.st_size,
                "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "type": file_path.suffix[1:].upper()
            })
    return {"documents": documents}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF or DOCX document."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Save file
    file_path = SOURCE_DOCS_DIR / file.filename
    content = await file.read()
    file_path.write_bytes(content)
    
    return {
        "id": file_path.stem,
        "name": file.filename,
        "size": len(content),
        "message": "Document uploaded successfully"
    }


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document."""
    for ext in [".pdf", ".docx", ".PDF", ".DOCX"]:
        file_path = SOURCE_DOCS_DIR / f"{doc_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            return {"message": f"Document {doc_id} deleted"}
    raise HTTPException(status_code=404, detail="Document not found")


# ============ Synthesis Endpoints ============

def run_synthesis_job(job_id: str, document_paths: List[str], synthesis_type: str, max_goldens: int):
    """Background task for running synthesis."""
    try:
        synthesis_jobs[job_id]["status"] = "running"
        synthesis_jobs[job_id]["message"] = "Initializing synthesizer..."
        
        generator = DatasetGenerator()
        
        if synthesis_type == "single":
            synthesis_jobs[job_id]["message"] = "Generating single-turn Q&A pairs..."
            generator.generate_single_turn(document_paths)
            result_file = SYNTHETIC_DATA_DIR / "single_turn_goldens.json"
        else:
            synthesis_jobs[job_id]["message"] = "Generating multi-turn conversations..."
            generator.generate_multi_turn(document_paths)
            result_file = SYNTHETIC_DATA_DIR / "multi_turn_goldens.json"
        
        # Load results
        if result_file.exists():
            with open(result_file, "r", encoding="utf-8") as f:
                goldens = json.load(f)
            synthesis_jobs[job_id]["result"] = {"count": len(goldens), "type": synthesis_type}
        
        synthesis_jobs[job_id]["status"] = "completed"
        synthesis_jobs[job_id]["progress"] = 100
        synthesis_jobs[job_id]["message"] = f"Generated {len(goldens)} {synthesis_type}-turn goldens"
        
    except Exception as e:
        synthesis_jobs[job_id]["status"] = "failed"
        synthesis_jobs[job_id]["message"] = str(e)


@app.post("/api/synthesis/start")
async def start_synthesis(request: SynthesisRequest, background_tasks: BackgroundTasks):
    """Start a synthesis job."""
    # Resolve document paths
    document_paths = []
    for doc_id in request.document_ids:
        for ext in [".pdf", ".docx", ".PDF", ".DOCX"]:
            file_path = SOURCE_DOCS_DIR / f"{doc_id}{ext}"
            if file_path.exists():
                document_paths.append(str(file_path))
                break
    
    if not document_paths:
        raise HTTPException(status_code=400, detail="No valid documents found")
    
    # Create job
    job_id = str(uuid.uuid4())[:8]
    synthesis_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Job queued...",
        "result": None
    }
    
    # Start background task
    background_tasks.add_task(
        run_synthesis_job, 
        job_id, 
        document_paths, 
        request.synthesis_type,
        request.max_goldens_per_context
    )
    
    return {"job_id": job_id, "message": "Synthesis job started"}


@app.get("/api/synthesis/status/{job_id}")
async def get_synthesis_status(job_id: str):
    """Get synthesis job status."""
    if job_id not in synthesis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return synthesis_jobs[job_id]


@app.post("/api/synthesis/cancel/{job_id}")
async def cancel_synthesis(job_id: str):
    """Cancel a synthesis job."""
    if job_id not in synthesis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = synthesis_jobs[job_id]
    if job["status"] in ["pending", "running"]:
        job["status"] = "cancelled"
        job["message"] = "Job cancelled by user"
        return {"message": f"Job {job_id} cancelled"}
    
    return {"message": f"Job {job_id} cannot be cancelled (status: {job['status']})"}


# ============ Goldens Endpoints ============

@app.get("/api/goldens")
async def list_goldens():
    """List all generated goldens."""
    result = {"single_turn": [], "multi_turn": []}
    
    single_file = SYNTHETIC_DATA_DIR / "single_turn_goldens.json"
    multi_file = SYNTHETIC_DATA_DIR / "multi_turn_goldens.json"
    
    if single_file.exists():
        with open(single_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            result["single_turn"] = [{"id": i, **g} for i, g in enumerate(data)]
    
    if multi_file.exists():
        with open(multi_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            result["multi_turn"] = [{"id": i, **g} for i, g in enumerate(data)]
    
    return result


@app.get("/api/goldens/{golden_type}")
async def get_goldens_by_type(golden_type: str):
    """Get goldens by type (single or multi)."""
    if golden_type not in ["single", "multi"]:
        raise HTTPException(status_code=400, detail="Type must be 'single' or 'multi'")
    
    file_path = SYNTHETIC_DATA_DIR / f"{golden_type}_turn_goldens.json"
    if not file_path.exists():
        return {"goldens": []}
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return {"goldens": [{"id": i, **g} for i, g in enumerate(data)]}


@app.put("/api/goldens/{golden_type}/{golden_id}")
async def update_golden(golden_type: str, golden_id: int, update: GoldenUpdate):
    """Update a golden's input or expected_output."""
    file_path = SYNTHETIC_DATA_DIR / f"{golden_type}_turn_goldens.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Goldens file not found")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if golden_id < 0 or golden_id >= len(data):
        raise HTTPException(status_code=404, detail="Golden not found")
    
    if update.input is not None:
        data[golden_id]["input"] = update.input
    if update.expected_output is not None:
        data[golden_id]["expected_output"] = update.expected_output
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    
    return {"message": "Golden updated", "golden": data[golden_id]}


@app.delete("/api/goldens/{golden_type}/{golden_id}")
async def delete_golden(golden_type: str, golden_id: int):
    """Delete a golden."""
    file_path = SYNTHETIC_DATA_DIR / f"{golden_type}_turn_goldens.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Goldens file not found")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if golden_id < 0 or golden_id >= len(data):
        raise HTTPException(status_code=404, detail="Golden not found")
    
    deleted = data.pop(golden_id)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    
    return {"message": "Golden deleted", "deleted": deleted}



# ============ Data Access ============

@app.get("/api/data/{data_type}")
async def get_synthetic_data(data_type: str):
    """
    Retrieve generated synthetic data.
    data_type: 'single-turn' or 'multi-turn'
    """
    if data_type not in ["single-turn", "multi-turn"]:
        raise HTTPException(status_code=400, detail="Invalid data type. Use 'single-turn' or 'multi-turn'.")
    
    filename = "single_turn_goldens.json" if data_type == "single-turn" else "multi_turn_goldens.json"
    file_path = SYNTHETIC_DATA_DIR / filename
    
    if not file_path.exists():
        return []
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return []


# ============ Evaluation Endpoints ============

evaluation_jobs = {}

def run_evaluation_job(job_id: str):
    """Background task for running pytest evaluation."""
    import subprocess
    import re
    
    try:
        evaluation_jobs[job_id]["status"] = "running"
        evaluation_jobs[job_id]["message"] = "Running tests..."
        
        # Run pytest with verbose output
        result = subprocess.run(
            ["pytest", "tests/", "-v", "--tb=short"],
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR),
            timeout=300
        )
        
        output = result.stdout + result.stderr
        
        # Parse test results
        tests = []
        for line in output.split('\n'):
            if '::test_' in line:
                # Capture the test name after ::, e.g. test_fact_retrieval[golden0]
                match = re.search(r'::(test_\w+(?:\[.*?\])?)', line)
                test_name = match.group(1) if match else line.split('::')[-1].split(' ')[0]
                
                if 'PASSED' in line:
                    tests.append({"name": test_name, "status": "passed"})
                elif 'FAILED' in line:
                    tests.append({"name": test_name, "status": "failed"})
        
        # Get summary
        passed = len([t for t in tests if t["status"] == "passed"])
        failed = len([t for t in tests if t["status"] == "failed"])
        
        evaluation_jobs[job_id]["status"] = "completed"
        evaluation_jobs[job_id]["progress"] = 100
        evaluation_jobs[job_id]["message"] = f"Completed: {passed} passed, {failed} failed"
        evaluation_jobs[job_id]["result"] = {
            "tests": tests,
            "passed": passed,
            "failed": failed,
            "total": passed + failed,
            "output": output[-2000:] if len(output) > 2000 else output  # Last 2000 chars
        }
        
    except subprocess.TimeoutExpired:
        evaluation_jobs[job_id]["status"] = "failed"
        evaluation_jobs[job_id]["message"] = "Tests timed out after 5 minutes"
    except Exception as e:
        evaluation_jobs[job_id]["status"] = "failed"
        evaluation_jobs[job_id]["message"] = str(e)


@app.post("/api/evaluation/start")
async def start_evaluation(background_tasks: BackgroundTasks):
    """Start an evaluation job."""
    # Check if synthetic data exists
    single_file = SYNTHETIC_DATA_DIR / "single_turn_goldens.json"
    multi_file = SYNTHETIC_DATA_DIR / "multi_turn_goldens.json"
    
    if not single_file.exists() and not multi_file.exists():
        raise HTTPException(status_code=400, detail="No synthetic data found. Run synthesis first.")
    
    job_id = str(uuid.uuid4())[:8]
    evaluation_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Starting evaluation...",
        "result": None
    }
    
    background_tasks.add_task(run_evaluation_job, job_id)
    
    return {"job_id": job_id, "message": "Evaluation started"}


@app.get("/api/evaluation/status/{job_id}")
async def get_evaluation_status(job_id: str):
    """Get evaluation job status."""
    if job_id not in evaluation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return evaluation_jobs[job_id]


@app.get("/api/evaluation/stream")
async def stream_evaluation():
    """Stream pytest output in real-time using SSE."""
    import subprocess
    import re
    import sys
    
    async def event_generator():
        # Check if synthetic data exists
        single_file = SYNTHETIC_DATA_DIR / "single_turn_goldens.json"
        multi_file = SYNTHETIC_DATA_DIR / "multi_turn_goldens.json"
        
        if not single_file.exists() and not multi_file.exists():
            yield {"event": "error", "data": "No synthetic data found. Run synthesis first."}
            return
        
        yield {"event": "log", "data": "Starting pytest..."}
        
        # Load current config to pass evaluation criteria
        env_vars = {**os.environ, "PYTHONUNBUFFERED": "1"}
        config_path = DATA_DIR / "generation_config.json"
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    conf = json.load(f)
                    if "eval_metric_name" in conf:
                        env_vars["EVAL_METRIC_NAME"] = conf["eval_metric_name"]
                    if "eval_metric_criteria" in conf:
                        env_vars["EVAL_METRIC_CRITERIA"] = conf["eval_metric_criteria"]
                    if "api_key" in conf and conf["api_key"]:
                        env_vars["OPENAI_API_KEY"] = conf["api_key"]
                    if "eval_threshold" in conf:
                        env_vars["EVAL_THRESHOLD"] = str(conf["eval_threshold"])
                    if "eval_timeout" in conf:
                        env_vars["EVAL_TIMEOUT"] = str(conf["eval_timeout"])
                    if "model_name" in conf:
                        env_vars["EVAL_MODEL"] = conf["model_name"]
                    if "max_user_simulations" in conf:
                        env_vars["MAX_USER_SIMULATIONS"] = str(conf["max_user_simulations"])
            except:
                pass

        # Use sys.executable to find pytest in the current venv
        # -s is needed to capture DeepEval's stdout output (metrics/scores)
        process = subprocess.Popen(
            [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "-s"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(BASE_DIR),
            env=env_vars
        )
        
        tests = []
        failure_map = {}
        in_failures_section = False
        current_failure_test = None
        current_test_metrics = []
        current_test_details = None
        
        # Stream output line by line
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            
            line_str = line.rstrip()
            
            # Capture potential metric lines (DeepEval usually prints "Metric: ...")
            # We look for lines containing typical metric keywords
            if any(x in line_str for x in ["Metric:", "Score:", "Reason:", "faithfulness", "answer_relevancy"]):
                 if not line_str.startswith("tests/"): # Avoid capturing the test runner line itself
                    current_test_metrics.append(line_str.strip())

            # Capture TEST_DETAILS_JSON from user-defined print statements
            if "TEST_DETAILS_JSON:" in line_str:
                try:
                    json_str = line_str.split("TEST_DETAILS_JSON:", 1)[1]
                    current_test_details = json.loads(json_str)
                except:
                    pass

            # 1. Parse Real-time Results
            if '::test_' in line_str and not in_failures_section:
                match = re.search(r'::(test_\w+(?:\[.*?\])?)', line_str)
                test_name = match.group(1) if match else line_str.split('::')[-1].split(' ')[0]
                
                # Format specific metrics for this test if available
                # We take the last few collected metrics as they likely belong to this test
                captured_metrics = "\n".join(current_test_metrics[-5:]) if current_test_metrics else "Passed (Metrics validated)"
                
                # Attach details if we found them recently (in the last few lines)
                details = None
                if current_test_details:
                     details = current_test_details
                     current_test_details = None # Reset after assignment
                
                if 'PASSED' in line_str:
                    tests.append({"name": test_name, "status": "passed", "metrics": captured_metrics, "details": details})
                    yield {"event": "test", "data": json.dumps({"name": test_name, "status": "passed", "metrics": captured_metrics, "details": details})}
                    current_test_metrics = [] # Reset after assignment
                elif 'FAILED' in line_str:
                    tests.append({"name": test_name, "status": "failed", "details": details})
                    yield {"event": "test", "data": json.dumps({"name": test_name, "status": "failed", "details": details})}
                    current_test_metrics = [] # Reset after assignment
            
            # 2. Detect Failures Section start
            if "==== FAILURES ====" in line_str:
                in_failures_section = True
            
            # 3. Parse Failure Details
            if in_failures_section:
                # Detect test header line pattern: _________ test_name[param] _________
                # Regex looks for at least 3 underscores, space, test name, space, 3 underscores
                # We also handle case where test name might be just function name without params
                header_match = re.search(r'_{3,} ((?:test_\w+)(?:\[.*?\])?) _{3,}', line_str)
                if header_match:
                    current_failure_test = header_match.group(1)
                    failure_map[current_failure_test] = []
                elif current_failure_test:
                    stripped = line_str.strip()
                    # Capture E lines (exception message)
                    if stripped.startswith('E '):
                         failure_map[current_failure_test].append(stripped[2:])
                    # Also capture lines that look like assertion errors if we haven't found E lines yet
                    elif 'Error:' in stripped and not failure_map[current_failure_test]:
                         failure_map[current_failure_test].append(stripped)

            # Send log line
            yield {"event": "log", "data": line_str}
            await asyncio.sleep(0.01)  # Small delay to prevent overwhelming
        
        process.wait()
        
        # Update failed tests with reasons
        processed_tests = []
        for test in tests:
            if test["status"] == "failed":
                reason = None
                # Try exact match
                if test["name"] in failure_map:
                    reason = "\n".join(failure_map[test["name"]])
                # Try match without params if exact match fails
                elif test["name"].split('[')[0] in failure_map:
                    reason = "\n".join(failure_map[test["name"].split('[')[0]])
                # Fallback: if we only have one failure map entry, assume it belongs to this test
                elif len(failure_map) == 1:
                     reason = "\n".join(list(failure_map.values())[0])
                
                test["reason"] = reason if reason else "Assertion failed. (Could not parse specific details from logs)"
            processed_tests.append(test)

        # Send summary
        passed = len([t for t in processed_tests if t["status"] == "passed"])
        failed = len([t for t in processed_tests if t["status"] == "failed"])
        
        yield {"event": "complete", "data": json.dumps({
            "tests": processed_tests,
            "passed": passed,
            "failed": failed,
            "total": passed + failed
        })}
    
    return EventSourceResponse(event_generator())


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """API health check."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "documents_count": len(list(SOURCE_DOCS_DIR.glob("*.pdf")) + list(SOURCE_DOCS_DIR.glob("*.docx")))
    }
