import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ABTestResponse } from '../types';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function ABTesting() {
  const [task, setTask] = useState('');
  const [runsPerModel, setRunsPerModel] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ABTestResponse | null>(null);
  const [error, setError] = useState('');
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const chartRef = useRef<HTMLCanvasElement>(null);

  const handleABTest = async () => {
    if (!task.trim()) {
      setError('Task cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/ab-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          runs_per_model: runsPerModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'A/B test failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (modelName: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(modelName)) {
      newExpanded.delete(modelName);
    } else {
      newExpanded.add(modelName);
    }
    setExpandedModels(newExpanded);
  };

  useEffect(() => {
    if (result && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      const canvas = chartRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const maxLatency = Math.max(...result.models.map(m => m.average_latency));
      const barWidth = width / (result.models.length * 2);
      const colors = ['#10b981', '#3b82f6', '#8b5cf6'];

      result.models.forEach((model, index) => {
        const barHeight = (model.average_latency / maxLatency) * (height - 60);
        const x = (width / result.models.length) * index + (width / result.models.length - barWidth) / 2;
        const y = height - barHeight - 40;

        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(model.model_name.split(' ')[2], x + barWidth / 2, height - 20);

        ctx.fillStyle = '#d1d5db';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${model.average_latency}ms`, x + barWidth / 2, y - 5);
      });
    }
  }, [result]);

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
            placeholder="e.g., Write a creative short story about space exploration"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Runs Per Model
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={runsPerModel}
            onChange={(e) => setRunsPerModel(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleABTest}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running A/B Test...
            </>
          ) : (
            'Run A/B Test'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-green-400">Comparison Results</h3>

          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h4 className="font-medium text-gray-200 mb-4">Latency Comparison</h4>
            <canvas
              ref={chartRef}
              width={600}
              height={300}
              className="w-full"
              style={{ maxHeight: '300px' }}
            />
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Model Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Avg Latency</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Avg Tokens</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {result.models.map((model) => (
                    <tr key={model.model_name} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-200 font-medium">{model.model_name}</td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-semibold">{model.average_latency}ms</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{model.average_tokens}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleModel(model.model_name)}
                          className="text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                        >
                          {expandedModels.has(model.model_name) ? 'Hide' : 'Show'}
                          {expandedModels.has(model.model_name) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.models.map((model) => (
            expandedModels.has(model.model_name) && (
              <div key={model.model_name} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                  <h4 className="font-medium text-gray-200">{model.model_name} - Individual Runs</h4>
                </div>
                <div className="divide-y divide-gray-700">
                  {model.runs.map((run) => (
                    <div key={run.run_number} className="p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-gray-400 font-medium">Run #{run.run_number}</span>
                        <span className="text-gray-500 text-sm">{run.latency_ms}ms</span>
                        <span className="text-gray-500 text-sm">{run.token_count} tokens</span>
                        <span className="text-xs text-gray-600">{run.timestamp}</span>
                      </div>
                      <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 max-h-32 overflow-y-auto">
                        {run.response_text}
                      </div>
                      {Object.keys(run.safety_ratings).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(run.safety_ratings).map(([category, rating]) => (
                            <span
                              key={category}
                              className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                            >
                              {category.replace('HARM_CATEGORY_', '')}: {rating}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
