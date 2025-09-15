import { useState } from 'react';
import { BarChart3, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import SingleEvaluation from './components/SingleEvaluation';
import ABTesting from './components/ABTesting';

type Tab = 'single' | 'ab-test';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('single');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-green-400 mb-2">AI Agent Evaluation Dashboard</h1>
          <p className="text-gray-400">Evaluate and compare AI agent performance across multiple metrics</p>
        </header>

        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-gray-900 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Single Evaluation
            </button>
            <button
              onClick={() => setActiveTab('ab-test')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'ab-test'
                  ? 'bg-gray-900 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                A/B Testing
              </span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'single' && <SingleEvaluation />}
            {activeTab === 'ab-test' && <ABTesting />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
