from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import time
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Agent Evaluation Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)


class EvaluationRequest(BaseModel):
    task: str
    expected_output: str
    k: int = 3


class ABTestRequest(BaseModel):
    task: str
    runs_per_model: int = 3


class RunResult(BaseModel):
    run_number: int
    response_text: str
    latency_ms: float
    token_count: int
    safety_ratings: Dict[str, Any]
    success: bool
    timestamp: str


class EvaluationResponse(BaseModel):
    pass_at_k: float
    average_latency: float
    success_rate: float
    total_runs: int
    runs: List[RunResult]


class ModelResult(BaseModel):
    model_name: str
    average_latency: float
    success_rate: float
    average_tokens: float
    runs: List[RunResult]


class ABTestResponse(BaseModel):
    models: List[ModelResult]


def check_success(response_text: str, expected_output: str) -> bool:
    """Simple success check - can be enhanced with more sophisticated matching"""
    if not expected_output.strip():
        return True
    return expected_output.lower() in response_text.lower()


def run_single_evaluation(task: str, expected_output: str, model_name: str = "gemini-1.5-flash") -> RunResult:
    """Run a single evaluation with the specified model"""
    try:
        model = genai.GenerativeModel(model_name)

        start_time = time.time()
        response = model.generate_content(task)
        end_time = time.time()

        latency_ms = (end_time - start_time) * 1000

        response_text = response.text if response.text else ""

        # Extract safety ratings
        safety_ratings = {}
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'safety_ratings'):
                for rating in candidate.safety_ratings:
                    safety_ratings[rating.category.name] = rating.probability.name

        # Count tokens (approximate from usage metadata)
        token_count = 0
        if hasattr(response, 'usage_metadata'):
            token_count = (response.usage_metadata.prompt_token_count +
                         response.usage_metadata.candidates_token_count)

        success = check_success(response_text, expected_output)

        return RunResult(
            run_number=0,
            response_text=response_text,
            latency_ms=round(latency_ms, 2),
            token_count=token_count,
            safety_ratings=safety_ratings,
            success=success,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during evaluation: {str(e)}")


def calculate_pass_at_k(task: str, expected_output: str, k: int, model_name: str = "gemini-1.5-flash") -> EvaluationResponse:
    """Run agent k times on same task and calculate success rate"""
    runs = []

    for i in range(k):
        result = run_single_evaluation(task, expected_output, model_name)
        result.run_number = i + 1
        runs.append(result)

        # Small delay between runs to avoid rate limiting
        if i < k - 1:
            time.sleep(0.5)

    successful_runs = sum(1 for run in runs if run.success)
    pass_at_k = (successful_runs / k) * 100 if k > 0 else 0
    average_latency = sum(run.latency_ms for run in runs) / k if k > 0 else 0

    return EvaluationResponse(
        pass_at_k=round(pass_at_k, 2),
        average_latency=round(average_latency, 2),
        success_rate=round(pass_at_k, 2),
        total_runs=k,
        runs=runs
    )


@app.get("/")
async def root():
    return {"message": "AI Agent Evaluation Dashboard API"}


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest):
    """Evaluate an agent task with Pass@K metric"""
    if request.k < 1 or request.k > 10:
        raise HTTPException(status_code=400, detail="k must be between 1 and 10")

    if not request.task.strip():
        raise HTTPException(status_code=400, detail="task cannot be empty")

    return calculate_pass_at_k(request.task, request.expected_output, request.k)


@app.post("/ab-test", response_model=ABTestResponse)
async def ab_test(request: ABTestRequest):
    """Compare 3 Gemini models on the same task"""
    if request.runs_per_model < 1 or request.runs_per_model > 10:
        raise HTTPException(status_code=400, detail="runs_per_model must be between 1 and 10")

    if not request.task.strip():
        raise HTTPException(status_code=400, detail="task cannot be empty")

    models = [
        ("gemini-1.5-flash-8b", "Gemini 1.5 Flash 8B (Fast)"),
        ("gemini-1.5-flash", "Gemini 1.5 Flash (Balanced)"),
        ("gemini-1.5-pro", "Gemini 1.5 Pro (Quality)")
    ]

    results = []

    for model_id, model_display_name in models:
        try:
            # For A/B testing, we don't check expected output (no success criteria)
            evaluation = calculate_pass_at_k(request.task, "", request.runs_per_model, model_id)

            avg_tokens = sum(run.token_count for run in evaluation.runs) / len(evaluation.runs) if evaluation.runs else 0

            model_result = ModelResult(
                model_name=model_display_name,
                average_latency=evaluation.average_latency,
                success_rate=100.0,  # No success criteria in A/B test
                average_tokens=round(avg_tokens, 2),
                runs=evaluation.runs
            )
            results.append(model_result)

            # Delay between models to avoid rate limiting
            time.sleep(1)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error testing model {model_display_name}: {str(e)}")

    return ABTestResponse(models=results)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
