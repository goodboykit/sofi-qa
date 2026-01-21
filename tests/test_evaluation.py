import pytest
import os
import json
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, Turn
from deepeval.dataset import EvaluationDataset
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, ConversationalGEval
from deepeval.simulator import ConversationSimulator
from src.processor import ChatbotAssistant

# Configuration (from environment variables)
EVAL_TIMEOUT = int(os.getenv("EVAL_TIMEOUT", "60"))
os.environ["DEEPEVAL_PER_TASK_TIMEOUT_SECONDS_OVERRIDE"] = str(EVAL_TIMEOUT)
EVAL_THRESHOLD = float(os.getenv("EVAL_THRESHOLD", "0.6"))
EVAL_MODEL = os.getenv("EVAL_MODEL", "gpt-4o-mini")
MAX_USER_SIMULATIONS = int(os.getenv("MAX_USER_SIMULATIONS", "2"))

# Load datasets
SINGLE_TURN_PATH = os.getenv("EVAL_SINGLE_TURN_PATH", "data/synthetic_data/single_turn_goldens.json")
MULTI_TURN_PATH = os.getenv("EVAL_MULTI_TURN_PATH", "data/synthetic_data/multi_turn_goldens.json")

single_ds = EvaluationDataset()
try:
    if os.path.exists(SINGLE_TURN_PATH):
        single_ds.add_goldens_from_json_file(file_path=SINGLE_TURN_PATH)
except Exception as e:
    print(f"Error loading single turn data: {e}")

multi_ds = EvaluationDataset()
try:
    if os.path.exists(MULTI_TURN_PATH):
        multi_ds.add_goldens_from_json_file(file_path=MULTI_TURN_PATH)
except Exception as e:
    print(f"Error loading multi turn data: {e}")


@pytest.mark.parametrize("golden", single_ds.goldens)
def test_fact_retrieval(golden):
    assistant = ChatbotAssistant()
    
    try:
        actual_output = assistant.generate_response(golden.input, context=golden.context)
    except Exception as e:
        actual_output = f"Error generating response: {str(e)}"
    
    details = {
        "input": golden.input,
        "actual": str(actual_output),
        "expected": golden.expected_output,
        "context": golden.context
    }
    print(f"\nTEST_DETAILS_JSON:{json.dumps(details)}")
    
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=str(actual_output),
        expected_output=golden.expected_output,
        retrieval_context=golden.context if golden.context else []
    )
    
    metrics = [
        AnswerRelevancyMetric(threshold=EVAL_THRESHOLD, model=EVAL_MODEL, include_reason=True),
        FaithfulnessMetric(threshold=EVAL_THRESHOLD, model=EVAL_MODEL, include_reason=True)
    ]
    
    assert_test(test_case, metrics)


@pytest.mark.parametrize("convo_golden", multi_ds.goldens)
def test_conversation_quality(convo_golden):
    assistant = ChatbotAssistant()

    async def chatbot_callback(input, turns=None, thread_id=None):
        try:
            # Pass the context from the golden to the assistant
            response = assistant.generate_response(input, context=convo_golden.context)
            return Turn(role="assistant", content=str(response))
        except Exception as e:
            return Turn(role="assistant", content=f"Error: {str(e)}")

    simulator = ConversationSimulator(model_callback=chatbot_callback)
    test_cases = simulator.simulate(
        conversational_goldens=[convo_golden],
        max_user_simulations=MAX_USER_SIMULATIONS
    )

    for test_case in test_cases:
        details = {
            "messages": [t.content for t in test_case.turns] if test_case.turns else [],
            "expected_outcome": getattr(convo_golden, 'expected_output', getattr(convo_golden, 'expected_outcome', "Professional and accurate response")),
            "context": convo_golden.context
        }
        print(f"\nTEST_DETAILS_JSON:{json.dumps(details)}")
        
        metric = ConversationalGEval(
            name=os.getenv("EVAL_METRIC_NAME", "Professionalism & Accuracy"),
            criteria=os.getenv(
                "EVAL_METRIC_CRITERIA", 
                "The chatbot should maintain a professional tone, provide accurate information "
                "based on the knowledge base, and respond helpfully to user queries."
            ),
            threshold=EVAL_THRESHOLD,
            model=EVAL_MODEL
        )
        
        assert_test(test_case, [metric])