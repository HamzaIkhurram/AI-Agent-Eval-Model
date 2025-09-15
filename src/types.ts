export interface RunResult {
  run_number: number;
  response_text: string;
  latency_ms: number;
  token_count: number;
  safety_ratings: Record<string, string>;
  success: boolean;
  timestamp: string;
}

export interface EvaluationResponse {
  pass_at_k: number;
  average_latency: number;
  success_rate: number;
  total_runs: number;
  runs: RunResult[];
}

export interface ModelResult {
  model_name: string;
  average_latency: number;
  success_rate: number;
  average_tokens: number;
  runs: RunResult[];
}

export interface ABTestResponse {
  models: ModelResult[];
}
