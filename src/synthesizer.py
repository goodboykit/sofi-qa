from typing import List, Optional
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import EvolutionConfig, Evolution, StylingConfig, FiltrationConfig
from src.config import get_model

import json
import tempfile
from pathlib import Path


def convert_pdf_to_text(path: str) -> Optional[str]:
    """
    Fallback: Convert a PDF to text using pdfplumber.
    Returns the path to the text file, or None if conversion fails.
    """
    path_obj = Path(path)
    
    try:
        import pdfplumber
        
        with pdfplumber.open(path) as pdf:
            text = '\n\n'.join([
                page.extract_text() or '' 
                for page in pdf.pages
            ])
        
        if text.strip():
            temp_dir = Path(tempfile.gettempdir()) / "sofi_qa_docs"
            temp_dir.mkdir(exist_ok=True)
            
            txt_path = temp_dir / f"{path_obj.stem}.txt"
            txt_path.write_text(text, encoding='utf-8')
            print(f"📄 Converted PDF to text: {path_obj.name} -> {txt_path.name}")
            return str(txt_path)
        else:
            print(f"⚠️ Warning: No text extracted from {path_obj.name}")
            return None
    except Exception as e:
        print(f"❌ Error converting PDF to text: {e}")
        return None


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

    def _try_generate_with_fallback(self, paths: List[str], generate_func, **kwargs):
        """
        Try to generate goldens directly from documents first.
        If PDF parsing fails (bbox errors, etc.), fall back to text conversion.
        """
        # Reset internal list to ensure file is clean
        self.synthesizer.synthetic_goldens = []
        
        try:
            # First attempt: Try reading documents directly (including PDFs)
            print(f"📚 Reading documents directly: {[Path(p).name for p in paths]}")
            generate_func(document_paths=paths, **kwargs)
            print("✅ Successfully generated goldens from documents directly!")
            
        except Exception as e:
            # Check if there are any PDFs in the input paths
            has_pdf_files = any(Path(p).suffix.lower() == '.pdf' for p in paths)
            
            if has_pdf_files:
                # If PDFs are involved and generation failed, try text conversion fallback
                print(f"⚠️ Error during document processing: {e}")
                print("🔄 PDFs detected in input. Attempting text conversion fallback...")
                
                # Convert PDFs to text and retry
                fallback_paths = []
                for path in paths:
                    path_obj = Path(path)
                    if path_obj.suffix.lower() == '.pdf':
                        txt_path = convert_pdf_to_text(path)
                        if txt_path:
                            fallback_paths.append(txt_path)
                        else:
                            print(f"⚠️ Skipping {path_obj.name} - could not convert to text")
                    else:
                        # Non-PDF files pass through as-is
                        fallback_paths.append(path)
                
                if fallback_paths:
                    try:
                        self.synthesizer.synthetic_goldens = []
                        generate_func(document_paths=fallback_paths, **kwargs)
                        print("✅ Successfully generated goldens using text conversion fallback!")
                    except Exception as fallback_error:
                        print(f"❌ Fallback also failed: {fallback_error}")
                        raise fallback_error
                else:
                    raise Exception("No documents could be processed - all PDF conversions failed")
            else:
                # No PDFs involved, re-raise the original error
                raise

    def generate_single_turn(self, paths: List[str]):
        """Generate single-turn Q&A pairs from documents."""
        self._try_generate_with_fallback(
            paths,
            self.synthesizer.generate_goldens_from_docs,
            max_goldens_per_context=2,
            include_expected_output=True
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="single_turn_goldens")

    def generate_multi_turn(self, paths: List[str]):
        """Generate multi-turn conversational goldens from documents."""
        self._try_generate_with_fallback(
            paths,
            self.synthesizer.generate_conversational_goldens_from_docs,
            max_goldens_per_context=3
        )
        self.synthesizer.save_as(file_type='json', directory="data/synthetic_data", file_name="multi_turn_goldens")