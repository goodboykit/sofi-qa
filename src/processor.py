from src.config import get_model

class ChatbotAssistant:
    def __init__(self):
        self.model = get_model()

    def generate_response(self, input_text: str):
        try:
            prompt = f"Answer based on your knowledge: {input_text}"
            response = self.model.generate(prompt)
            
            if isinstance(response, tuple):
                return str(response[0])
            return str(response)
        except Exception as e:
            return f"Error: {str(e)}"