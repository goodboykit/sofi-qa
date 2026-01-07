import pytest
import os
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, ConversationalTestCase, Turn
from deepeval.dataset import EvaluationDataset
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, ConversationalGEval
from deepeval.simulator import ConversationSimulator
from src.processor import ChatbotAssistant

os.environ["DEEPEVAL_PER_TASK_TIMEOUT_SECONDS_OVERRIDE"] = "300"

# Load Datasets
single_ds = EvaluationDataset()
single_ds.add_goldens_from_json_file(file_path="data/synthetic_data/single_turn_goldens.json")

multi_ds = EvaluationDataset()
multi_ds.add_goldens_from_json_file(file_path="data/synthetic_data/multi_turn_goldens.json")

# --- GROUP 1: Single-Turn Performance (Fact Checking) ---
@pytest.mark.parametrize("golden", single_ds.goldens)
def test_fact_retrieval(golden):
    assistant = ChatbotAssistant()
    actual_output = assistant.generate_response(golden.input)
    
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=str(actual_output),
        expected_output=golden.expected_output,
        retrieval_context=golden.context 
    )
    
    # We use a slightly lower threshold to account for model variations
    assert_test(test_case, [
        AnswerRelevancyMetric(threshold=0.6),
        FaithfulnessMetric(threshold=0.6)
    ])

# --- GROUP 2: Multi-Turn Conversation Quality (Interaction) ---
@pytest.mark.parametrize("convo_golden", multi_ds.goldens)
def test_conversation_quality(convo_golden):
    assistant = ChatbotAssistant()

    # FIX: Argument MUST be named 'input' for v3.x inspection logic
    async def chatbot_callback(input, turns=None, thread_id=None):
        response = assistant.generate_response(input)
        return Turn(role="assistant", content=str(response))

    # Initialize Simulator with the fixed callback
    simulator = ConversationSimulator(model_callback=chatbot_callback)
    
    # Generate the dialogue turns
    test_cases = simulator.simulate(
        conversational_goldens=[convo_golden],
        max_user_simulations=2
    )

    for test_case in test_cases:
        metric = ConversationalGEval(
            name="Professionalism & Accuracy",
            criteria="Does the bot maintain the Clark Safari persona and provide accurate info?"
        )
        assert_test(test_case, [metric])