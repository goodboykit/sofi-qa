"""
SoFi-QA Evaluation Tests
========================
Comprehensive test suite for evaluating chatbot quality using DeepEval metrics.
This tests both single-turn fact retrieval and multi-turn conversation quality.
"""

import pytest
import os
import json
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, ConversationalTestCase, Turn
from deepeval.dataset import EvaluationDataset
from deepeval.metrics import (
    AnswerRelevancyMetric, 
    FaithfulnessMetric, 
    ContextualRelevancyMetric,
    ConversationalGEval
)
from deepeval.simulator import ConversationSimulator
from src.processor import ChatbotAssistant

# ============ Configuration ============
# All values are configurable from the frontend Configuration page

# Timeout per test (saves API credits)
EVAL_TIMEOUT = int(os.getenv("EVAL_TIMEOUT", "60"))
os.environ["DEEPEVAL_PER_TASK_TIMEOUT_SECONDS_OVERRIDE"] = str(EVAL_TIMEOUT)

# Pass threshold (0-1, higher = stricter)
EVAL_THRESHOLD = float(os.getenv("EVAL_THRESHOLD", "0.6"))

# Model for evaluation metrics (uses same model as synthesis)
EVAL_MODEL = os.getenv("EVAL_MODEL", "gpt-4o-mini")

# Number of conversation simulations for multi-turn tests
MAX_USER_SIMULATIONS = int(os.getenv("MAX_USER_SIMULATIONS", "2"))

# ============ Load Datasets ============
SINGLE_TURN_PATH = os.getenv("EVAL_SINGLE_TURN_PATH", "data/synthetic_data/single_turn_goldens.json")
MULTI_TURN_PATH = os.getenv("EVAL_MULTI_TURN_PATH", "data/synthetic_data/multi_turn_goldens.json")

single_ds = EvaluationDataset()
try:
    if os.path.exists(SINGLE_TURN_PATH):
        single_ds.add_goldens_from_json_file(file_path=SINGLE_TURN_PATH)
    else:
         print(f"Warning: {SINGLE_TURN_PATH} not found.")
except Exception as e:
    print(f"Error loading single turn data: {e}")

multi_ds = EvaluationDataset()
try:
    if os.path.exists(MULTI_TURN_PATH):
        multi_ds.add_goldens_from_json_file(file_path=MULTI_TURN_PATH)
    else:
        print(f"Warning: {MULTI_TURN_PATH} not found.")
except Exception as e:
    print(f"Error loading multi turn data: {e}")


# ============ GROUP 1: Single-Turn Performance ============
# Tests fact retrieval accuracy, answer relevancy, and faithfulness to context

@pytest.mark.parametrize("golden", single_ds.goldens)
def test_fact_retrieval(golden):
    """
    Tests single-turn Q&A performance.
    
    Metrics evaluated:
    - AnswerRelevancyMetric: Is the answer relevant to the question?
    - FaithfulnessMetric: Is the answer faithful to the provided context?
    """
    assistant = ChatbotAssistant()
    
    try:
        actual_output = assistant.generate_response(golden.input)
    except Exception as e:
        actual_output = f"Error generating response: {str(e)}"
    
    # Print structured details for UI extraction
    details = {
        "input": golden.input,
        "actual": str(actual_output),
        "expected": golden.expected_output,
        "context": golden.context
    }
    print(f"\nTEST_DETAILS_JSON:{json.dumps(details)}")
    
    # Create test case with all available context
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=str(actual_output),
        expected_output=golden.expected_output,
        retrieval_context=golden.context if golden.context else []
    )
    
    # Comprehensive metrics for highest quality assurance
    metrics = [
        AnswerRelevancyMetric(
            threshold=EVAL_THRESHOLD,
            model=EVAL_MODEL,
            include_reason=True
        ),
        FaithfulnessMetric(
            threshold=EVAL_THRESHOLD,
            model=EVAL_MODEL,
            include_reason=True
        )
    ]
    
    assert_test(test_case, metrics)


# ============ GROUP 2: Multi-Turn Conversation Quality ============
# Tests conversation flow, persona consistency, and response quality

@pytest.mark.parametrize("convo_golden", multi_ds.goldens)
def test_conversation_quality(convo_golden):
    """
    Tests multi-turn conversation quality.
    
    Metrics evaluated:
    - ConversationalGEval: Custom criteria for persona and accuracy
    """
    assistant = ChatbotAssistant()

    # Callback for conversation simulation
    async def chatbot_callback(input, turns=None, thread_id=None):
        try:
            response = assistant.generate_response(input)
            return Turn(role="assistant", content=str(response))
        except Exception as e:
            return Turn(role="assistant", content=f"Error: {str(e)}")

    # Initialize Simulator
    simulator = ConversationSimulator(model_callback=chatbot_callback)
    
    # Generate dialogue turns (configurable number of simulations)
    test_cases = simulator.simulate(
        conversational_goldens=[convo_golden],
        max_user_simulations=MAX_USER_SIMULATIONS
    )

    for test_case in test_cases:
        # Print structured details for UI extraction
        details = {
            "messages": [t.content for t in test_case.turns] if test_case.turns else [],
            "expected_outcome": convo_golden.expected_outcome if hasattr(convo_golden, 'expected_outcome') else "Professional and accurate response"
        }
        print(f"\nTEST_DETAILS_JSON:{json.dumps(details)}")
        
        # Dynamic metric from configuration
        metric = ConversationalGEval(
            name=os.getenv("EVAL_METRIC_NAME", "Professionalism & Accuracy"),
            criteria=os.getenv(
                "EVAL_METRIC_CRITERIA", 
                "The chatbot should maintain a professional tone, provide accurate information "
                "based on the knowledge base, and respond helpfully to user queries. "
                "Responses should be clear, concise, and relevant to the question asked."
            ),
            threshold=EVAL_THRESHOLD,
            model=EVAL_MODEL
        )
        
        assert_test(test_case, [metric])