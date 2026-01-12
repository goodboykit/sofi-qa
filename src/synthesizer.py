from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
from pathlib import Path

class DatasetGenerator:
    def __init__(self):
        self.model = get_model()
        
        # Load config dynamically
        config_path = Path("data/generation_config.json")
        config = {}
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

        # Config defaults
        reasoning_weight = config.get("reasoning_weight", 0.5)
        multicontext_weight = config.get("multicontext_weight", 0.5)
        task = config.get("task", "Expert Customer Support")
        scenario = config.get("scenario", "A customer interacting with an automated assistant.")
        input_format = config.get("input_format", "Professional and specific queries")
        expected_output_format = config.get("expected_output_format", "Detailed responses with citations")
        
        # Advanced settings
        self.num_evolutions = config.get("num_evolutions", 2)
        self.num_goldens = config.get("num_goldens", 2)

        self.evolution_config = EvolutionConfig(
            evolutions={
                Evolution.REASONING: reasoning_weight,
                Evolution.MULTICONTEXT: multicontext_weight
            },
            num_evolutions=self.num_evolutions
        )
        self.styling_config = StylingConfig(
            task=task,
            scenario=scenario,
            input_format=input_format,
            expected_output_format=expected_output_format
        )
        self.synthesizer = Synthesizer(
            model=self.model,
            evolution_config=self.evolution_config,
            styling_config=self.styling_config,
            filtration_config=FiltrationConfig()
        )

    def generate_single_turn(self, paths: List[str]):
        # Reset internal list to ensure file is clean
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_goldens_from_docs(
            document_paths=paths,
            max_goldens_per_context=self.num_goldens,
            include_expected_output=True
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="single_turn_goldens")

    def generate_multi_turn(self, paths: List[str]):
        # Clear both lists to be safe and ensure clean generation
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.synthetic_conversational_goldens = []
        
        self.synthesizer.generate_conversational_goldens_from_docs(
            document_paths=paths,
            max_goldens_per_context=self.num_goldens
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="multi_turn_goldens")