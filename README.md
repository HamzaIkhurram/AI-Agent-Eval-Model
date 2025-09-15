# AI Agent Evaluation Dashboard

A professional web application for evaluating and comparing AI agent performance using Google Gemini models. Features single evaluation with Pass@K metrics and A/B testing across multiple model variants.

## Features

- **Single Evaluation**: Test AI agents with Pass@K scoring, latency tracking, and safety ratings
- **A/B Testing**: Compare three Gemini model variants (Flash 8B, Flash, Pro) side-by-side
- **Comprehensive Metrics**: Latency, token count, success rate, safety ratings
- **Visual Analytics**: Interactive charts for performance comparison
- **Dark Mode UI**: Professional interface with green accent colors
- **Responsive Design**: Works seamlessly on mobile and desktop

## Prerequisites

- Python 3.8+
- Node.js 18+
- Google Gemini API Key

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Environment Variables

The `.env` file is already configured with your Gemini API key:

```
GEMINI_API_KEY=AIzaSyBeX5dENpwMKhsE3VAtN5VOXm2GWYVp0J8
```

### 4. Start the Backend Server

```bash
cd backend
python main.py
```

The FastAPI server will start on `http://localhost:8000`

### 5. Start the Frontend Development Server

In a new terminal:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### POST /evaluate

Evaluate an agent task with Pass@K metric.

**Request Body:**
```json
{
  "task": "Summarize this medical report",
  "expected_output": "patient, diagnosis, treatment",
  "k": 3
}
```

**Response:**
```json
{
  "pass_at_k": 100.0,
  "average_latency": 1234.56,
  "success_rate": 100.0,
  "total_runs": 3,
  "runs": [...]
}
```

### POST /ab-test

Compare three Gemini models on the same task.

**Request Body:**
```json
{
  "task": "Write a creative short story",
  "runs_per_model": 3
}
```

**Response:**
```json
{
  "models": [
    {
      "model_name": "Gemini 1.5 Flash 8B (Fast)",
      "average_latency": 800.5,
      "success_rate": 100.0,
      "average_tokens": 150.2,
      "runs": [...]
    },
    ...
  ]
}
```

## Usage Guide

### Single Evaluation

1. Navigate to the "Single Evaluation" tab
2. Enter your task description (e.g., "Summarize this article")
3. Optionally add expected output keywords for success checking
4. Adjust the K value (1-5) using the slider
5. Click "Run Evaluation"
6. View Pass@K score, average latency, and individual run details
7. Expand runs to see full responses and safety ratings
8. Copy results as JSON for further analysis

### A/B Testing

1. Navigate to the "A/B Testing" tab
2. Enter your task description
3. Set the number of runs per model (1-5)
4. Click "Run A/B Test"
5. View comparison chart showing latency differences
6. Review detailed metrics table for each model
7. Expand individual models to see run-by-run results

## Metrics Explained

- **Pass@K**: Percentage of successful attempts out of K runs
- **Latency**: Response time in milliseconds
- **Token Count**: Total input + output tokens used
- **Safety Ratings**: Gemini's content safety scores (harassment, hate speech, dangerous content)
- **Success Rate**: Overall success percentage across runs

## Technology Stack

**Backend:**
- FastAPI (Python web framework)
- Google Generative AI (Gemini models)
- Python-dotenv (environment management)

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- Canvas API (chart visualization)

## Development

To run type checking:

```bash
npm run typecheck
```

To build for production:

```bash
npm run build
```

To lint the code:

```bash
npm run lint
```

## Project Structure

```
.
├── backend/
│   └── main.py           # FastAPI server with evaluation logic
├── src/
│   ├── components/
│   │   ├── SingleEvaluation.tsx
│   │   └── ABTesting.tsx
│   ├── types.ts          # TypeScript interfaces
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
└── .env                  # Environment variables
```

## Security Notes

- Never commit the `.env` file with API keys to version control
- The `.env` file is already in `.gitignore`
- API keys are server-side only and not exposed to the frontend

## Troubleshooting

**Backend won't start:**
- Ensure Python dependencies are installed: `pip install -r requirements.txt`
- Verify GEMINI_API_KEY is set in `.env`

**Frontend can't connect to backend:**
- Ensure backend is running on port 8000
- Check CORS settings in `backend/main.py`

**Rate limiting errors:**
- Reduce the number of runs per evaluation
- Add delays between API calls (already implemented)

## License

MIT
