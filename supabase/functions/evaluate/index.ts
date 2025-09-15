import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface EvaluationRequest {
  task: string;
  expected_output: string;
  k: number;
}

interface RunResult {
  run_number: number;
  response_text: string;
  latency_ms: number;
  token_count: number;
  safety_ratings: Record<string, string>;
  success: boolean;
  timestamp: string;
}

interface EvaluationResponse {
  pass_at_k: number;
  average_latency: number;
  success_rate: number;
  total_runs: number;
  runs: RunResult[];
}

function checkSuccess(responseText: string, expectedOutput: string): boolean {
  if (!expectedOutput.trim()) {
    return true;
  }
  return responseText.toLowerCase().includes(expectedOutput.toLowerCase());
}

async function runSingleEvaluation(
  task: string,
  expectedOutput: string,
  modelName: string = "gemini-1.5-flash"
): Promise<RunResult> {
  const startTime = Date.now();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: task }],
        }],
      }),
    }
  );

  const endTime = Date.now();
  const latencyMs = endTime - startTime;

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();

  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const safetyRatings: Record<string, string> = {};
  if (data.candidates?.[0]?.safetyRatings) {
    for (const rating of data.candidates[0].safetyRatings) {
      safetyRatings[rating.category] = rating.probability;
    }
  }

  const tokenCount =
    (data.usageMetadata?.promptTokenCount || 0) +
    (data.usageMetadata?.candidatesTokenCount || 0);

  const success = checkSuccess(responseText, expectedOutput);

  return {
    run_number: 0,
    response_text: responseText,
    latency_ms: Math.round(latencyMs * 100) / 100,
    token_count: tokenCount,
    safety_ratings: safetyRatings,
    success,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

async function calculatePassAtK(
  task: string,
  expectedOutput: string,
  k: number,
  modelName: string = "gemini-1.5-flash"
): Promise<EvaluationResponse> {
  const runs: RunResult[] = [];

  for (let i = 0; i < k; i++) {
    const result = await runSingleEvaluation(task, expectedOutput, modelName);
    result.run_number = i + 1;
    runs.push(result);

    if (i < k - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const successfulRuns = runs.filter((run) => run.success).length;
  const passAtK = k > 0 ? (successfulRuns / k) * 100 : 0;
  const averageLatency = k > 0
    ? runs.reduce((sum, run) => sum + run.latency_ms, 0) / k
    : 0;

  return {
    pass_at_k: Math.round(passAtK * 100) / 100,
    average_latency: Math.round(averageLatency * 100) / 100,
    success_rate: Math.round(passAtK * 100) / 100,
    total_runs: k,
    runs,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const body: EvaluationRequest = await req.json();

    if (!body.task?.trim()) {
      return new Response(
        JSON.stringify({ detail: "task cannot be empty" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const k = body.k || 3;
    if (k < 1 || k > 10) {
      return new Response(
        JSON.stringify({ detail: "k must be between 1 and 10" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await calculatePassAtK(
      body.task,
      body.expected_output || "",
      k
    );

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        detail: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
