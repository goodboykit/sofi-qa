from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
from pathlib import Path

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
        # Reset internal list to ensure file is clean
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_goldens_from_docs(
            document_paths=paths,
            max_goldens_per_context=2,
            include_expected_output=True
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="single_turn_goldens")

    def generate_multi_turn(self, paths: List[str]):
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_conversational_goldens_from_docs(
            document_paths=paths,
            max_goldens_per_context=3
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="multi_turn_goldens")