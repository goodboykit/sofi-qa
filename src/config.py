import os
from deepeval.models import GPTModel
from dotenv import load_dotenv

load_dotenv()

def get_model():
    api_key = os.getenv("OPENAI_API_KEY")
    model_name = os.getenv("EVAL_MODEL", "gpt-4o-mini")
    
    if not api_key or model_name == "gpt-4o-mini":
        try:
            import json
            from pathlib import Path
            config_path = Path(__file__).parent.parent / "data" / "generation_config.json"
            if config_path.exists():
                with open(config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    if not api_key and config.get("api_key"):
                        api_key = config["api_key"]
                    if config.get("model_name"):
                        model_name = config["model_name"]
        except Exception:
            pass

    return GPTModel(model=model_name, api_key=api_key)