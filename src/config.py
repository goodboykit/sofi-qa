import os
from deepeval.models import GPTModel
from dotenv import load_dotenv

load_dotenv()

def get_model():
    # Using gpt-4o-mini for better quality synthesis while keeping costs low
    return GPTModel(
        model="gpt-4o-mini", 
        api_key=os.getenv("OPENAI_API_KEY")
    )