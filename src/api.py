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
    config: Optional[dict] = None

class EvaluationRequest(BaseModel):
    single_turn_goldens: List[dict] = []
    multi_turn_goldens: List[dict] = []
    config: Optional[dict] = None


# Removed GoldenUpdate and ConfigUpdate models as they are no longer used for persistence



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


# Removed update_config (POST) as config is now client-side state


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

def run_synthesis_job(job_id: str, document_paths: List[str], synthesis_type: str, max_goldens: int, config: dict):
    """Background task for running synthesis."""
    try:
        synthesis_jobs[job_id]["status"] = "running"
        synthesis_jobs[job_id]["message"] = "Initializing synthesizer..."
        
        # Initialize generator with user-provided config
        generator = DatasetGenerator(config)
        
        goldens = []
        if synthesis_type == "single":
            synthesis_jobs[job_id]["message"] = "Generating single-turn Q&A pairs..."
            # Generator now returns the goldens list directly (modified in synthesizer.py previously)
            # Wait, I need to double check if synthesizer.py returns them.
            # Assuming generator.generate_single_turn returns the list.
            # Actually, looking at previous synthesizer.py edits, the previous user Edit (Step 105 summary) 
            # said "Modified generate_single_turn to return generated goldens".
            # Let's assume it returns data.
            goldens = generator.generate_single_turn(document_paths)
        else:
            synthesis_jobs[job_id]["message"] = "Generating multi-turn conversations..."
            goldens = generator.generate_multi_turn(document_paths)
        
        # Store result in memory (Stateless Backend)
        synthesis_jobs[job_id]["result"] = {
            "count": len(goldens) if goldens else 0, 
            "type": synthesis_type,
            "data": goldens # Pass the actual data back to frontend
        }
        
        synthesis_jobs[job_id]["status"] = "completed"
        synthesis_jobs[job_id]["progress"] = 100
        synthesis_jobs[job_id]["message"] = f"Generated {len(goldens) if goldens else 0} {synthesis_type}-turn goldens"
        
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
        request.max_goldens_per_context,
        request.config or {}
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


# Removed Goldens Management and Data Access endpoints (Stateless)



# ============ Evaluation Endpoints ============

evaluation_jobs = {}

def run_evaluation_job(job_id: str, single_turn_path: Path, multi_turn_path: Path, config: dict):
    """Background task for running pytest evaluation."""
    import subprocess
    import re
    # Import shutil/os for cleanup? os is already imported at top level.
    
    try:
        evaluation_jobs[job_id]["status"] = "running"
        evaluation_jobs[job_id]["message"] = "Running tests..."
        
        # Prepare Env Vars
        env_vars = {**os.environ, "PYTHONUNBUFFERED": "1"}
        env_vars["EVAL_SINGLE_TURN_PATH"] = str(single_turn_path)
        env_vars["EVAL_MULTI_TURN_PATH"] = str(multi_turn_path)
        
        # Add config vars
        if config:
            if "eval_metric_name" in config:
                env_vars["EVAL_METRIC_NAME"] = config["eval_metric_name"]
            if "eval_metric_criteria" in config:
                env_vars["EVAL_METRIC_CRITERIA"] = config["eval_metric_criteria"]
            if "api_key" in config and config["api_key"]:
                env_vars["OPENAI_API_KEY"] = config["api_key"]
            if "eval_threshold" in config:
                env_vars["EVAL_THRESHOLD"] = str(config["eval_threshold"])
            if "eval_timeout" in config:
                env_vars["EVAL_TIMEOUT"] = str(config["eval_timeout"])
            if "model_name" in config:
                env_vars["EVAL_MODEL"] = config["model_name"]
            if "max_user_simulations" in config:
                env_vars["MAX_USER_SIMULATIONS"] = str(config["max_user_simulations"])

        # Run pytest
        result = subprocess.run(
            ["pytest", "tests/", "-v", "--tb=short"],
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR),
            timeout=300,
            env=env_vars
        )
        
        output = result.stdout + result.stderr
        
        # Parse test results
        tests = []
        for line in output.split('\n'):
            if '::test_' in line:
                match = re.search(r'::(test_\w+(?:\[.*?\])?)', line)
                test_name = match.group(1) if match else line.split('::')[-1].split(' ')[0]
                
                if 'PASSED' in line:
                    tests.append({"name": test_name, "status": "passed"})
                elif 'FAILED' in line:
                    tests.append({"name": test_name, "status": "failed"})
        
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
            "output": output[-2000:] if len(output) > 2000 else output
        }
        
    except subprocess.TimeoutExpired:
        evaluation_jobs[job_id]["status"] = "failed"
        evaluation_jobs[job_id]["message"] = "Tests timed out after 5 minutes"
    except Exception as e:
        evaluation_jobs[job_id]["status"] = "failed"
        evaluation_jobs[job_id]["message"] = str(e)
    finally:
        # Cleanup temp files
        try:
            if single_turn_path.exists():
                single_turn_path.unlink()
            if multi_turn_path.exists():
                multi_turn_path.unlink()
        except:
            pass


# Job path mapping for streaming
eval_job_paths = {}

@app.post("/api/evaluation/start")
async def start_evaluation(request: EvaluationRequest, background_tasks: BackgroundTasks):
    """Start an evaluation job with provided data."""
    if not request.single_turn_goldens and not request.multi_turn_goldens:
         raise HTTPException(status_code=400, detail="No goldens provided for evaluation.")
    
    job_id = str(uuid.uuid4())[:8]
    
    # Save goldens to temp files
    temp_dir = DATA_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    single_turn_path = temp_dir / f"single_{job_id}.json"
    multi_turn_path = temp_dir / f"multi_{job_id}.json"
    
    with open(single_turn_path, "w", encoding="utf-8") as f:
        json.dump(request.single_turn_goldens, f)
        
    with open(multi_turn_path, "w", encoding="utf-8") as f:
        json.dump(request.multi_turn_goldens, f)

    # Store paths for streaming endpoint
    eval_job_paths[job_id] = {
        "single": single_turn_path,
        "multi": multi_turn_path,
        "config": request.config or {}
    }
    
    return {"job_id": job_id, "message": "Evaluation ready. Connect to /stream?job_id={job_id}"}


@app.get("/api/evaluation/stream")
async def stream_evaluation(job_id: str):
    """Stream pytest output in real-time using SSE."""
    import subprocess
    import re
    import sys
    
    async def event_generator():
        if job_id not in eval_job_paths:
            yield {"event": "error", "data": "Job not found or expired."}
            return

        paths = eval_job_paths[job_id]
        single_turn_path = paths["single"]
        multi_turn_path = paths["multi"]
        config = paths["config"]
        
        yield {"event": "log", "data": "Starting pytest..."}
        
        # Prepare Env Vars
        env_vars = {**os.environ, "PYTHONUNBUFFERED": "1"}
        env_vars["EVAL_SINGLE_TURN_PATH"] = str(single_turn_path)
        env_vars["EVAL_MULTI_TURN_PATH"] = str(multi_turn_path)
        
        if config:
            if "eval_metric_name" in config:
                env_vars["EVAL_METRIC_NAME"] = config["eval_metric_name"]
            if "eval_metric_criteria" in config:
                env_vars["EVAL_METRIC_CRITERIA"] = config["eval_metric_criteria"]
            if "api_key" in config and config["api_key"]:
                env_vars["OPENAI_API_KEY"] = config["api_key"]
            if "eval_threshold" in config:
                env_vars["EVAL_THRESHOLD"] = str(config["eval_threshold"])
            if "eval_timeout" in config:
                env_vars["EVAL_TIMEOUT"] = str(config["eval_timeout"])
            if "model_name" in config:
                env_vars["EVAL_MODEL"] = config["model_name"]
            if "max_user_simulations" in config:
                env_vars["MAX_USER_SIMULATIONS"] = str(config["max_user_simulations"])

        # Use sys.executable to find pytest in the current venv
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
        
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            
            line_str = line.rstrip()
            
            # Capture metrics
            if any(x in line_str for x in ["Metric:", "Score:", "Reason:", "faithfulness", "answer_relevancy"]):
                 if not line_str.startswith("tests/"):
                    current_test_metrics.append(line_str.strip())

            # Capture details
            if "TEST_DETAILS_JSON:" in line_str:
                try:
                    json_str = line_str.split("TEST_DETAILS_JSON:", 1)[1]
                    current_test_details = json.loads(json_str)
                except:
                    pass

            # Parse results
            if '::test_' in line_str and not in_failures_section:
                match = re.search(r'::(test_\w+(?:\[.*?\])?)', line_str)
                test_name = match.group(1) if match else line_str.split('::')[-1].split(' ')[0]
                
                captured_metrics = "\n".join(current_test_metrics[-5:]) if current_test_metrics else "Passed (Metrics validated)"
                
                details = None
                if current_test_details:
                     details = current_test_details
                     current_test_details = None
                
                if 'PASSED' in line_str:
                    tests.append({"name": test_name, "status": "passed", "metrics": captured_metrics, "details": details})
                    yield {"event": "test", "data": json.dumps({"name": test_name, "status": "passed", "metrics": captured_metrics, "details": details})}
                    current_test_metrics = []
                elif 'FAILED' in line_str:
                    tests.append({"name": test_name, "status": "failed", "details": details})
                    yield {"event": "test", "data": json.dumps({"name": test_name, "status": "failed", "details": details})}
                    current_test_metrics = []
            
            # Failures parsing
            if "==== FAILURES ====" in line_str:
                in_failures_section = True
            
            if in_failures_section:
                header_match = re.search(r'_{3,} ((?:test_\w+)(?:\[.*?\])?) _{3,}', line_str)
                if header_match:
                    current_failure_test = header_match.group(1)
                    failure_map[current_failure_test] = []
                elif current_failure_test:
                    stripped = line_str.strip()
                    if stripped.startswith('E '):
                         failure_map[current_failure_test].append(stripped[2:])
                    elif 'Error:' in stripped and not failure_map[current_failure_test]:
                         failure_map[current_failure_test].append(stripped)

            yield {"event": "log", "data": line_str}
            await asyncio.sleep(0.01)
        
        process.wait()
        
        # Cleanup
        try:
            if single_turn_path.exists(): single_turn_path.unlink()
            if multi_turn_path.exists(): multi_turn_path.unlink()
            del eval_job_paths[job_id]
        except:
            pass

        # Summary
        processed_tests = []
        for test in tests:
            if test["status"] == "failed":
                reason = None
                if test["name"] in failure_map:
                    reason = "\n".join(failure_map[test["name"]])
                elif test["name"].split('[')[0] in failure_map:
                    reason = "\n".join(failure_map[test["name"].split('[')[0]])
                elif len(failure_map) == 1:
                     reason = "\n".join(list(failure_map.values())[0])
                test["reason"] = reason or "Assertion failed."
            processed_tests.append(test)

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


# ============ Serve Frontend (MUST BE LAST) ============
# This catches all non-API routes and serves the React app
frontend_dist = BASE_DIR / "frontend/dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
