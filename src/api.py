"""
SoFi-QA Backend API
"""

import os
import json
import uuid
import asyncio
import subprocess
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.synthesizer import DatasetGenerator

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
SOURCE_DOCS_DIR = DATA_DIR / "source_docs"
SYNTHETIC_DATA_DIR = DATA_DIR / "synthetic_data"

SOURCE_DOCS_DIR.mkdir(parents=True, exist_ok=True)
SYNTHETIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Job tracking
synthesis_jobs = {}
evaluation_jobs = {}
eval_job_paths = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 SoFi-QA API starting...")
    yield
    print("👋 SoFi-QA API shutting down...")


app = FastAPI(
    title="SoFi-QA API",
    description="Synthetic QA Data Generation & Evaluation API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=SOURCE_DOCS_DIR), name="files")


# ============ Models ============

class SynthesisRequest(BaseModel):
    document_ids: List[str]
    max_goldens_per_context: int = 2
    synthesis_type: str = "single"
    config: Optional[dict] = None

class EvaluationRequest(BaseModel):
    single_turn_goldens: List[dict] = []
    multi_turn_goldens: List[dict] = []
    config: Optional[dict] = None


# ============ Config ============

@app.get("/api/config")
async def get_config():
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
        "eval_metric_criteria": "Does the bot maintain persona and provide accurate info?",
        "model_name": "gpt-4o-mini",
        "num_evolutions": 2,
        "num_goldens": 2,
        "eval_threshold": 0.7,
        "eval_timeout": 60,
        "max_user_simulations": 2
    }


@app.post("/api/config")
async def save_config(config: dict):
    """Save configuration to disk."""
    try:
        config_path = DATA_DIR / "generation_config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        return {"status": "success", "message": "Configuration saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Synthetic Data ============

@app.get("/api/synthetic-data")
async def get_synthetic_data():
    """Load synthetic data from JSON files on disk."""
    single_path = SYNTHETIC_DATA_DIR / "single_turn_goldens.json"
    multi_path = SYNTHETIC_DATA_DIR / "multi_turn_goldens.json"
    
    single_data = []
    multi_data = []
    
    if single_path.exists():
        try:
            with open(single_path, "r", encoding="utf-8") as f:
                single_data = json.load(f)
        except Exception as e:
            print(f"Error loading single_turn_goldens.json: {e}")
    
    if multi_path.exists():
        try:
            with open(multi_path, "r", encoding="utf-8") as f:
                multi_data = json.load(f)
        except Exception as e:
            print(f"Error loading multi_turn_goldens.json: {e}")
    
    return {
        "single_turn": single_data,
        "multi_turn": multi_data
    }


# ============ Documents ============

@app.get("/api/documents")
async def list_documents():
    documents = []
    for file_path in SOURCE_DOCS_DIR.iterdir():
        if file_path.suffix.lower() in [".pdf", ".docx", ".xlsx", ".csv", ".txt"]:
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
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".xlsx", ".csv", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, XLSX, CSV, TXT supported")
    
    file_path = SOURCE_DOCS_DIR / file.filename
    content = await file.read()
    file_path.write_bytes(content)
    
    return {"id": file_path.stem, "name": file.filename, "size": len(content)}


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    for ext in [".pdf", ".docx", ".xlsx", ".csv", ".txt", ".PDF", ".DOCX", ".XLSX", ".CSV", ".TXT"]:
        file_path = SOURCE_DOCS_DIR / f"{doc_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            return {"message": f"Document {doc_id} deleted"}
    raise HTTPException(status_code=404, detail="Document not found")


# ============ Synthesis ============

def run_synthesis_job(job_id: str, doc_paths: List[str], syn_type: str, max_goldens: int, config: dict):
    try:
        synthesis_jobs[job_id]["status"] = "running"
        synthesis_jobs[job_id]["message"] = f"Generating {syn_type}-turn Q&A..."
        
        generator = DatasetGenerator(config)
        goldens = generator.generate_single_turn(doc_paths) if syn_type == "single" else generator.generate_multi_turn(doc_paths)
        
        synthesis_jobs[job_id]["result"] = {"count": len(goldens) if goldens else 0, "type": syn_type, "data": goldens}
        synthesis_jobs[job_id]["status"] = "completed"
        synthesis_jobs[job_id]["progress"] = 100
        synthesis_jobs[job_id]["message"] = f"Generated {len(goldens) if goldens else 0} {syn_type}-turn goldens"
    except Exception as e:
        synthesis_jobs[job_id]["status"] = "failed"
        synthesis_jobs[job_id]["message"] = str(e)


@app.post("/api/synthesis/start")
async def start_synthesis(request: SynthesisRequest, background_tasks: BackgroundTasks):
    doc_paths = []
    for doc_id in request.document_ids:
        for ext in [".pdf", ".docx", ".PDF", ".DOCX"]:
            file_path = SOURCE_DOCS_DIR / f"{doc_id}{ext}"
            if file_path.exists():
                doc_paths.append(str(file_path))
                break
    
    if not doc_paths:
        raise HTTPException(status_code=400, detail="No valid documents found")
    
    job_id = str(uuid.uuid4())[:8]
    synthesis_jobs[job_id] = {"job_id": job_id, "status": "pending", "progress": 0, "message": "Queued...", "result": None}
    
    background_tasks.add_task(run_synthesis_job, job_id, doc_paths, request.synthesis_type, request.max_goldens_per_context, request.config or {})
    return {"job_id": job_id, "message": "Synthesis started"}


@app.get("/api/synthesis/status/{job_id}")
async def get_synthesis_status(job_id: str):
    if job_id not in synthesis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return synthesis_jobs[job_id]


@app.post("/api/synthesis/cancel/{job_id}")
async def cancel_synthesis(job_id: str):
    if job_id not in synthesis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = synthesis_jobs[job_id]
    if job["status"] in ["pending", "running"]:
        job["status"] = "cancelled"
        job["message"] = "Cancelled by user"
    return {"message": f"Job {job_id} {job['status']}"}


# ============ Evaluation ============

def _build_env_vars(config: dict, single_path: Path, multi_path: Path) -> dict:
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    env["EVAL_SINGLE_TURN_PATH"] = str(single_path)
    env["EVAL_MULTI_TURN_PATH"] = str(multi_path)
    
    if config:
        mappings = [
            ("eval_metric_name", "EVAL_METRIC_NAME"),
            ("eval_metric_criteria", "EVAL_METRIC_CRITERIA"),
            ("eval_threshold", "EVAL_THRESHOLD"),
            ("eval_timeout", "EVAL_TIMEOUT"),
            ("model_name", "EVAL_MODEL"),
            ("max_user_simulations", "MAX_USER_SIMULATIONS"),
        ]
        for cfg_key, env_key in mappings:
            if cfg_key in config:
                env[env_key] = str(config[cfg_key])
        if config.get("api_key"):
            env["OPENAI_API_KEY"] = config["api_key"]
    return env


@app.post("/api/evaluation/start")
async def start_evaluation(request: EvaluationRequest):
    if not request.single_turn_goldens and not request.multi_turn_goldens:
        raise HTTPException(status_code=400, detail="No goldens provided")
    
    job_id = str(uuid.uuid4())[:8]
    temp_dir = DATA_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    single_path = temp_dir / f"single_{job_id}.json"
    multi_path = temp_dir / f"multi_{job_id}.json"
    
    single_path.write_text(json.dumps(request.single_turn_goldens), encoding="utf-8")
    multi_path.write_text(json.dumps(request.multi_turn_goldens), encoding="utf-8")
    
    eval_job_paths[job_id] = {"single": single_path, "multi": multi_path, "config": request.config or {}}
    return {"job_id": job_id}


@app.get("/api/evaluation/stream")
async def stream_evaluation(job_id: str):
    async def event_generator():
        if job_id not in eval_job_paths:
            yield {"event": "error", "data": "Job not found"}
            return

        paths = eval_job_paths[job_id]
        env = _build_env_vars(paths["config"], paths["single"], paths["multi"])
        
        yield {"event": "log", "data": "Starting tests..."}
        
        process = subprocess.Popen(
            [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "-s"],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, cwd=str(BASE_DIR), env=env
        )
        
        tests, failure_map = [], {}
        in_failures, current_fail = False, None
        metrics, details = [], None
        
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            line_str = line.rstrip()
            
            # Capture metrics
            if any(x in line_str for x in ["Metric:", "Score:", "Reason:", "faithfulness", "answer_relevancy"]):
                if not line_str.startswith("tests/"):
                    metrics.append(line_str.strip())
            
            # Capture test details
            if "TEST_DETAILS_JSON:" in line_str:
                try:
                    details = json.loads(line_str.split("TEST_DETAILS_JSON:", 1)[1])
                except:
                    pass
            
            # Parse test results
            if '::test_' in line_str and not in_failures:
                match = re.search(r'::(test_\w+(?:\[.*?\])?)', line_str)
                name = match.group(1) if match else line_str.split('::')[-1].split()[0]
                metric_str = "\n".join(metrics[-5:]) if metrics else "Passed"
                
                if 'PASSED' in line_str:
                    tests.append({"name": name, "status": "passed", "metrics": metric_str, "details": details})
                    yield {"event": "test", "data": json.dumps({"name": name, "status": "passed", "metrics": metric_str})}
                elif 'FAILED' in line_str:
                    tests.append({"name": name, "status": "failed", "details": details})
                    yield {"event": "test", "data": json.dumps({"name": name, "status": "failed"})}
                metrics, details = [], None
            
            # Parse failures section
            if "==== FAILURES ====" in line_str:
                in_failures = True
            if in_failures:
                m = re.search(r'_{3,} (test_\w+(?:\[.*?\])?) _{3,}', line_str)
                if m:
                    current_fail = m.group(1)
                    failure_map[current_fail] = []
                elif current_fail and line_str.strip().startswith('E '):
                    failure_map[current_fail].append(line_str.strip()[2:])
            
            yield {"event": "log", "data": line_str}
            await asyncio.sleep(0.01)
        
        process.wait()
        
        # Cleanup
        try:
            paths["single"].unlink()
            paths["multi"].unlink()
            del eval_job_paths[job_id]
        except:
            pass
        
        # Attach failure reasons
        for t in tests:
            if t["status"] == "failed":
                key = t["name"].split('[')[0] if '[' in t["name"] else t["name"]
                t["reason"] = "\n".join(failure_map.get(t["name"], failure_map.get(key, ["Assertion failed"])))
        
        passed = sum(1 for t in tests if t["status"] == "passed")
        failed = len(tests) - passed
        
        yield {"event": "complete", "data": json.dumps({"tests": tests, "passed": passed, "failed": failed, "total": len(tests)})}
    
    return EventSourceResponse(event_generator())


# ============ Health ============

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "documents_count": len(list(SOURCE_DOCS_DIR.glob("*.pdf")) + list(SOURCE_DOCS_DIR.glob("*.docx")))
    }


# ============ Serve Frontend (MUST BE LAST) ============
frontend_dist = BASE_DIR / "frontend/dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
