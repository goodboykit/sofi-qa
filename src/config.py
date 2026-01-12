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

    # Using gpt-4o-mini for better quality synthesis while keeping costs low
    return GPTModel(
        model="gpt-4o-mini", 
        api_key=api_key
    )