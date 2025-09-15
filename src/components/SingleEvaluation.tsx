import { useState } from 'react';
import { Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { EvaluationResponse } from '../types';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function SingleEvaluation() {
  const [task, setTask] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [k, setK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const handleEvaluate = async () => {
    if (!task.trim()) {
      setError('Task cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          expected_output: expectedOutput,
          k,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Evaluation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyResults = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleRun = (runNumber: number) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runNumber)) {
      newExpanded.delete(runNumber);
    } else {
      newExpanded.add(runNumber);
    }
    setExpandedRuns(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Task Description
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Summarize this medical report in simple terms"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Expected Output (optional)
          </label>
          <textarea
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="e.g., patient, diagnosis, treatment"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to skip success checking
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            K Value: {k}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>5</span>
          </div>
        </div>

        <button
          onClick={handleEvaluate}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Evaluation...
            </>
          ) : (
            'Run Evaluation'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-green-400">Results</h3>
            <button
              onClick={copyResults}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Pass@K Score</p>
              <p className="text-3xl font-bold text-green-400">{result.pass_at_k}%</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Avg Latency</p>
              <p className="text-3xl font-bold text-green-400">{result.average_latency}ms</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-green-400">{result.success_rate}%</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
              <h4 className="font-medium text-gray-200">Individual Runs</h4>
            </div>
            <div className="divide-y divide-gray-700">
              {result.runs.map((run) => (
                <div key={run.run_number} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRun(run.run_number)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 font-medium">Run #{run.run_number}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        run.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}>
                        {run.success ? 'Success' : 'Failed'}
                      </span>
                      <span className="text-gray-500 text-sm">{run.latency_ms}ms</span>
                      <span className="text-gray-500 text-sm">{run.token_count} tokens</span>
                    </div>
                    {expandedRuns.has(run.run_number) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {expandedRuns.has(run.run_number) && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Response</p>
                        <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 max-h-40 overflow-y-auto">
                          {run.response_text}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">Safety Ratings</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(run.safety_ratings).map(([category, rating]) => (
                            <span
                              key={category}
                              className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                            >
                              {category.replace('HARM_CATEGORY_', '')}: {rating}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {run.timestamp}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
