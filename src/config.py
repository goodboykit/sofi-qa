import os
from deepeval.models import GPTModel
from dotenv import load_dotenv

load_dotenv()

def get_model():
    return GPTModel(
        model="gpt-4.1-mini", 
        api_key=os.getenv("OPENAI_API_KEY")
    )