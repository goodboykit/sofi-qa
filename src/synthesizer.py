from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
from pathlib import Path


class DatasetGenerator:
    """
    Generates synthetic Q&A datasets from documents using DeepEval's built-in PDF parsing.
    
    DeepEval uses langchain-community for document loading, which supports PDF files directly.
    With pymupdf installed, the PDF parsing is robust across all platforms (Windows, Mac, Linux).
    
    No text conversion is performed - PDFs are read directly by DeepEval.
    """
    
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
                Evolution.REASONING: config_data.get("reasoning_weight", 0.6),
                Evolution.MULTICONTEXT: config_data.get("multicontext_weight", 0.4)
            },
            num_evolutions=2
        )
        self.styling_config = StylingConfig(
            task=config_data.get("task", "Expert Customer Support"),
            scenario=config_data.get("scenario", "A customer interacting with an automated assistant."),
            input_format=config_data.get("input_format", "Professional and specific queries"),
            expected_output_format=config_data.get("expected_output_format", "Detailed responses with citations")
        )
        
        # Create filtration config to ensure quality
        filtration = FiltrationConfig(
            max_quality_retries=5
        )
        
        self.synthesizer = Synthesizer(
            model=self.model,
            evolution_config=self.evolution_config,
            styling_config=self.styling_config,
            filtration_config=filtration
        )

    def _generate_from_docs(self, paths: List[str], generate_func, **kwargs):
        """
        Generate goldens directly from documents using DeepEval's built-in PDF parser.
        
        No fallback to text conversion - relies on pymupdf for robust PDF parsing.
        If parsing fails, the error is raised directly.
        """
        # Reset internal list to ensure clean state
        self.synthesizer.synthetic_goldens = []
        
        # High-quality chunking parameters for better context
        chunk_args = {
            "chunk_size": 1024,  # Larger chunks for better context quality
            "chunk_overlap": 100  # Overlap to prevent splitting sentences/context
        }
        kwargs.update(chunk_args)
        
        # Read documents directly (DeepEval uses langchain + pymupdf for PDFs)
        print(f"📚 Reading documents: {[Path(p).name for p in paths]}")
        generate_func(document_paths=paths, **kwargs)
        print("✅ Successfully generated goldens from documents!")

    def generate_single_turn(self, paths: List[str]):
        """Generate single-turn Q&A pairs from documents."""
        self._generate_from_docs(
            paths,
            self.synthesizer.generate_goldens_from_docs,
            max_goldens_per_context=5,
            include_expected_output=True,
            num_evolutions=3
        )
        self.synthesizer.save_as(
            file_type='json', 
            directory="data/synthetic_data", 
            file_name="single_turn_goldens"
        )
        print("💾 Saved to data/synthetic_data/single_turn_goldens.json")

    def generate_multi_turn(self, paths: List[str]):
        """Generate multi-turn conversational goldens from documents."""
        self._generate_from_docs(
            paths,
            self.synthesizer.generate_conversational_goldens_from_docs,
            max_goldens_per_context=4
        )
        self.synthesizer.save_as(
            file_type='json', 
            directory="data/synthetic_data", 
            file_name="multi_turn_goldens"
        )
        print("💾 Saved to data/synthetic_data/multi_turn_goldens.json")