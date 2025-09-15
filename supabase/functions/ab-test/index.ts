import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface ABTestRequest {
  task: string;
  runs_per_model: number;
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

interface ModelResult {
  model_name: string;
  average_latency: number;
  success_rate: number;
  average_tokens: number;
  runs: RunResult[];
}

interface ABTestResponse {
  models: ModelResult[];
}

async function runSingleEvaluation(
  task: string,
  modelName: string
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

  return {
    run_number: 0,
    response_text: responseText,
    latency_ms: Math.round(latencyMs * 100) / 100,
    token_count: tokenCount,
    safety_ratings: safetyRatings,
    success: true,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

async function testModel(
  task: string,
  modelId: string,
  modelDisplayName: string,
  runsPerModel: number
): Promise<ModelResult> {
  const runs: RunResult[] = [];

  for (let i = 0; i < runsPerModel; i++) {
    const result = await runSingleEvaluation(task, modelId);
    result.run_number = i + 1;
    runs.push(result);

    if (i < runsPerModel - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const averageLatency = runs.length > 0
    ? runs.reduce((sum, run) => sum + run.latency_ms, 0) / runs.length
    : 0;

  const averageTokens = runs.length > 0
    ? runs.reduce((sum, run) => sum + run.token_count, 0) / runs.length
    : 0;

  return {
    model_name: modelDisplayName,
    average_latency: Math.round(averageLatency * 100) / 100,
    success_rate: 100.0,
    average_tokens: Math.round(averageTokens * 100) / 100,
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

    const body: ABTestRequest = await req.json();

    if (!body.task?.trim()) {
      return new Response(
        JSON.stringify({ detail: "task cannot be empty" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const runsPerModel = body.runs_per_model || 3;
    if (runsPerModel < 1 || runsPerModel > 10) {
      return new Response(
        JSON.stringify({ detail: "runs_per_model must be between 1 and 10" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const models = [
      ["gemini-1.5-flash-8b", "Gemini 1.5 Flash 8B (Fast)"],
      ["gemini-1.5-flash", "Gemini 1.5 Flash (Balanced)"],
      ["gemini-1.5-pro", "Gemini 1.5 Pro (Quality)"],
    ];

    const results: ModelResult[] = [];

    for (const [modelId, modelDisplayName] of models) {
      const modelResult = await testModel(
        body.task,
        modelId,
        modelDisplayName,
        runsPerModel
      );
      results.push(modelResult);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const response: ABTestResponse = {
      models: results,
    };

    return new Response(JSON.stringify(response), {
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
