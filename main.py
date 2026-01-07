import os
from src.synthesizer import DatasetGenerator

def run_synthesis():
    generator = DatasetGenerator()
    
    source_dir = "data/source_docs"
    source_files = [os.path.join(source_dir, f) for f in os.listdir(source_dir) if f.endswith(('.pdf', '.docx'))]
    
    if not source_files:
        print("No source documents found.")
        return

    print("--- Starting Single-Turn Synthesis ---")
    generator.generate_single_turn(source_files)
    
    print("--- Starting Multi-Turn Synthesis ---")
    generator.generate_multi_turn(source_files)
    
    print("Synthesis complete. Files saved in data/synthetic_data/")

if __name__ == "__main__":
    run_synthesis()