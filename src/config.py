import os
from deepeval.models import GPTModel
from dotenv import load_dotenv

load_dotenv()

import json
from pathlib import Path

def get_model():
    # Try to load API key from config file first
    api_key = os.getenv("OPENAI_API_KEY")
    try:
        config_path = Path(__file__).parent.parent / "data" / "generation_config.json"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                if config.get("api_key"):
                    api_key = config["api_key"]
    except:
        pass

    # Try to load model name from config
    model_name = "gpt-4o-mini"
    if config.get("model_name"):
        model_name = config["model_name"]

    return GPTModel(
        model=model_name, 
        api_key=api_key
    )