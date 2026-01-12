from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
import tempfile
import os
from pathlib import Path


def preprocess_documents(paths: List[str]) -> List[str]:
    """
    Preprocess document paths - convert PDFs to text files to avoid bbox parsing errors.
    Returns a list of paths that DeepEval can safely process.
    """
    processed_paths = []
    
    for path in paths:
        path_obj = Path(path)
        
        if path_obj.suffix.lower() == '.pdf':
            try:
                import pdfplumber
                
                # Extract text from PDF
                with pdfplumber.open(path) as pdf:
                    text = '\n\n'.join([
                        page.extract_text() or '' 
                        for page in pdf.pages
                    ])
                
                if text.strip():
                    # Save as temp text file
                    temp_dir = Path(tempfile.gettempdir()) / "sofi_qa_docs"
                    temp_dir.mkdir(exist_ok=True)
                    
                    txt_path = temp_dir / f"{path_obj.stem}.txt"
                    txt_path.write_text(text, encoding='utf-8')
                    processed_paths.append(str(txt_path))
                    print(f"Preprocessed PDF: {path_obj.name} -> {txt_path.name}")
                else:
                    print(f"Warning: No text extracted from {path_obj.name}")
            except ImportError:
                print("Warning: pdfplumber not installed, passing PDF directly to DeepEval")
                processed_paths.append(path)
            except Exception as e:
                print(f"Warning: Could not preprocess {path_obj.name}: {e}")
                processed_paths.append(path)
        else:
            # Non-PDF files pass through as-is
            processed_paths.append(path)
    
    return processed_paths


class DatasetGenerator:
    def __init__(self):
        self.model = get_model()
        
        # Load config
        config_path = Path(__file__).parent.parent / "data" / "generation_config.json"
        
        # Default config
        config_data = {
            "task": "Expert Customer Support",
            "scenario": "A customer interacting with an automated assistant.",
            "input_format": "Professional and specific queries",
            "expected_output_format": "Detailed responses with citations",
            "reasoning_weight": 0.5,
            "multicontext_weight": 0.5
        }
        
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    file_config = json.load(f)
                    config_data.update(file_config)
            except Exception as e:
                print(f"Error loading config: {e}")
        else:
            # Save default config
            try:
                with open(config_path, "w", encoding="utf-8") as f:
                    json.dump(config_data, f, indent=2)
            except:
                pass

        self.evolution_config = EvolutionConfig(
            evolutions={
                Evolution.REASONING: config_data.get("reasoning_weight", 0.5),
                Evolution.MULTICONTEXT: config_data.get("multicontext_weight", 0.5)
            },
            num_evolutions=2
        )
        self.styling_config = StylingConfig(
            task=config_data.get("task", "Expert Customer Support"),
            scenario=config_data.get("scenario", "A customer interacting with an automated assistant."),
            input_format=config_data.get("input_format", "Professional and specific queries"),
            expected_output_format=config_data.get("expected_output_format", "Detailed responses with citations")
        )
        self.synthesizer = Synthesizer(
            model=self.model,
            evolution_config=self.evolution_config,
            styling_config=self.styling_config,
            filtration_config=FiltrationConfig()
        )

    def generate_single_turn(self, paths: List[str]):
        # Preprocess PDFs to avoid bbox parsing errors
        processed_paths = preprocess_documents(paths)
        
        # Reset internal list to ensure file is clean
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_goldens_from_docs(
            document_paths=processed_paths,
            max_goldens_per_context=2,
            include_expected_output=True
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="single_turn_goldens")

    def generate_multi_turn(self, paths: List[str]):
        # Preprocess PDFs to avoid bbox parsing errors
        processed_paths = preprocess_documents(paths)
        
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_conversational_goldens_from_docs(
            document_paths=processed_paths,
            max_goldens_per_context=3
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="multi_turn_goldens")