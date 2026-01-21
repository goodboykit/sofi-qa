import os
import json
from pathlib import Path
from src.config import get_model

class ChatbotAssistant:
    def __init__(self):
        self.model = get_model()
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self):
        """Loads the system prompt (task) from environment variable or config file."""
        default_prompt = "You are a helpful assistant."
        
        env_task = os.getenv("EVAL_TASK_DESCRIPTION")
        if env_task:
            return env_task
        
        try:
            config_path = Path(__file__).parent.parent / "data" / "generation_config.json"
            if config_path.exists():
                with open(config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    return config.get("task", default_prompt)
        except Exception:
            pass
        
        return default_prompt

    def generate_response(self, input_text: str):
        try:
            prompt = f"""System: {self.system_prompt}

User: {input_text}"""
            
            response = self.model.generate(prompt)
            
            if isinstance(response, tuple):
                return str(response[0])
            return str(response)
        except Exception as e:
            return f"Error: {str(e)}"