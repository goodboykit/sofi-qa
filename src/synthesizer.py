from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

class DatasetGenerator:
    def __init__(self):
        self.model = get_model()
        self.evolution_config = EvolutionConfig(
            evolutions={Evolution.REASONING: 0.5, Evolution.MULTICONTEXT: 0.5},
            num_evolutions=2
        )
        self.styling_config = StylingConfig(
            task="Expert Customer Support",
            scenario="A customer interacting with an automated assistant.",
            input_format="Professional and specific queries",
            expected_output_format="Detailed responses with citations"
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