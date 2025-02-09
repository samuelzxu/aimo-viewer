'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LLMEval {
  uuid: string;
  exec_time: string;
  runtime_s: number;
  p_id: string;
  run_name: string;
  prediction: number;
  label: number;
  extracted_answers: number[];
  reasoning: string;
}

interface RawLLMEval {
  uuid: string;
  exec_time: string;
  runtime_s: string | number;
  p_id: string;
  run_name: string;
  prediction: number;
  label: number;
  extracted_answers: number[] | null | undefined;
  reasoning: string;
}

export default function LLMEvalsViewer() {
  const router = useRouter();
  const [data, setData] = useState<LLMEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [runNames, setRunNames] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [minDistinctAnswers, setMinDistinctAnswers] = useState<number>(0);
  const [maxDistinctAnswers, setMaxDistinctAnswers] = useState<number>(0);
  const [distinctAnswersRange, setDistinctAnswersRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/db-viewer?action=getData&table=llm_evals');
      const rawData = await response.json();
      // Convert runtime_s to number and handle other fields
      const processedData = rawData.map((row: RawLLMEval) => ({
        ...row,
        runtime_s: row.runtime_s ? Number(row.runtime_s) : 0,
        extracted_answers: Array.isArray(row.extracted_answers) ? row.extracted_answers : []
      }));
      setData(processedData);

      // Extract unique run names with proper typing
      const runs = [...new Set(processedData.map((row: LLMEval) => row.run_name))].filter((name): name is string => typeof name === 'string');
      setRunNames(runs);

      // Calculate min/max distinct answers
      const distinctCounts = processedData.map((row: LLMEval) => 
        new Set(row.extracted_answers).size
      );
      const minCount = Math.min(...distinctCounts);
      const maxCount = Math.max(...distinctCounts);
      setMinDistinctAnswers(minCount);
      setMaxDistinctAnswers(maxCount);
      setDistinctAnswersRange([minCount, maxCount]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(row => {
    const matchesRun = !selectedRun || row.run_name === selectedRun;
    const distinctCount = new Set(row.extracted_answers).size;
    const matchesDistinct = distinctCount >= distinctAnswersRange[0] && distinctCount <= distinctAnswersRange[1];
    return matchesRun && matchesDistinct;
  });

  const handleRowClick = (uuid: string) => {
    router.push(`/llm-evals/${uuid}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100">LLM Evaluations</h1>
      
      <div className="mb-8 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filter by Run Name
            </label>
            <select
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
            >
              <option value="">All Runs</option>
              {runNames.map((run) => (
                <option key={run} value={run}>{run}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Distinct Answers Range
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minDistinctAnswers}
                  max={distinctAnswersRange[1]}
                  value={distinctAnswersRange[0]}
                  onChange={(e) => setDistinctAnswersRange([
                    Math.min(Number(e.target.value), distinctAnswersRange[1]),
                    distinctAnswersRange[1]
                  ])}
                  className="w-24 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <span className="text-slate-500 dark:text-slate-400">to</span>
                <input
                  type="number"
                  min={distinctAnswersRange[0]}
                  max={maxDistinctAnswers}
                  value={distinctAnswersRange[1]}
                  onChange={(e) => setDistinctAnswersRange([
                    distinctAnswersRange[0],
                    Math.max(Number(e.target.value), distinctAnswersRange[0])
                  ])}
                  className="w-24 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Range: {minDistinctAnswers} - {maxDistinctAnswers}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-600 dark:text-slate-300">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Execution Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Runtime (s)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Run Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Prediction</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Label</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Distinct Answers</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                {filteredData.map((row) => (
                  <tr 
                    key={row.uuid} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {new Date(row.exec_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {typeof row.runtime_s === 'number' ? row.runtime_s.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {row.run_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {row.prediction}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {new Set(row.extracted_answers).size}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleRowClick(row.uuid)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 