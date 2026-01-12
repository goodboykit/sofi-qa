from typing import List
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
from pathlib import Path


def extract_text_from_pdf(path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        text_parts = []
        with fitz.open(path) as doc:
            for page in doc:
                text = page.get_text("text")
                if text:
                    text_parts.append(text.strip())
        return '\n\n'.join(text_parts)
    except Exception as e:
        print(f"⚠️ PyMuPDF failed: {e}, trying pypdf...")
        try:
            from pypdf import PdfReader
            reader = PdfReader(path)
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text.strip())
            return '\n\n'.join(text_parts)
        except Exception as e2:
            print(f"❌ PDF extraction failed: {e2}")
            return ""


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


class DatasetGenerator:
    """
    Generates synthetic Q&A datasets from documents using DeepEval.
    
    Uses direct text extraction and context passing to ensure full control over parsing.
    Powered by OpenAI GPT-4o-mini.
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
        
        # Create filtration config 
        filtration = FiltrationConfig(
            critic_model=self.model,
            max_quality_retries=5
        )
        
        self.synthesizer = Synthesizer(
            model=self.model,
            evolution_config=self.evolution_config,
            styling_config=self.styling_config,
            filtration_config=filtration
        )

    def _extract_contexts(self, paths: List[str]) -> List[List[str]]:
        """Extract text from documents and create context chunks."""
        all_contexts = []
        
        for path in paths:
            path_obj = Path(path)
            print(f"📄 Extracting text from: {path_obj.name}")
            
            if path_obj.suffix.lower() == '.pdf':
                text = extract_text_from_pdf(path)
            else:
                try:
                    text = path_obj.read_text(encoding='utf-8')
                except:
                    text = ""
            
            if text:
                chunks = chunk_text(text, chunk_size=1500, overlap=200)
                # Create context groups (each chunk becomes a context)
                for chunk in chunks[:10]:  # Limit to 10 chunks per document
                    all_contexts.append([chunk])
                print(f"   ✅ Extracted {len(chunks)} chunks")
            else:
                print(f"   ⚠️ No text extracted")
        
        return all_contexts

    def generate_single_turn(self, paths: List[str]):
        """Generate single-turn Q&A pairs from documents."""
        print(f"📚 Processing {len(paths)} document(s)...")
        
        # Extract contexts from documents
        contexts = self._extract_contexts(paths)
        
        if not contexts:
            print("❌ No contexts extracted from documents")
            return
        
        print(f"🔄 Generating Q&A from {len(contexts)} contexts...")
        
        # Reset and generate
        self.synthesizer.synthetic_goldens = []
        self.synthesizer.generate_goldens_from_contexts(
            contexts=contexts,
            max_goldens_per_context=2,
            include_expected_output=True
        )
        
        self.synthesizer.save_as(
            file_type='json', 
            directory="data/synthetic_data", 
            file_name="single_turn_goldens"
        )
        print("✅ Successfully generated goldens!")
        print("💾 Saved to data/synthetic_data/single_turn_goldens.json")

    def generate_multi_turn(self, paths: List[str]):
        """Generate multi-turn conversational goldens from documents."""
        print(f"📚 Processing {len(paths)} document(s)...")
        
        # Extract contexts from documents
        contexts = self._extract_contexts(paths)
        
        if not contexts:
            print("❌ No contexts extracted from documents")
            return
        
        print(f"🔄 Generating conversations from {len(contexts)} contexts...")
        
        # Reset and generate
        self.synthesizer.synthetic_conversational_goldens = []
        self.synthesizer.generate_conversational_goldens_from_contexts(
            contexts=contexts,
            max_goldens_per_context=2
        )
        
        self.synthesizer.save_as(
            file_type='json', 
            directory="data/synthetic_data", 
            file_name="multi_turn_goldens"
        )
        print("✅ Successfully generated conversational goldens!")
        print("💾 Saved to data/synthetic_data/multi_turn_goldens.json")