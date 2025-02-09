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

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageInput: string;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageInputChange: (value: string) => void;
  onPageInputBlur: () => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  pageInput,
  pageSize,
  totalItems,
  onPageChange,
  onPageInputChange,
  onPageInputBlur
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} to {Math.min(totalItems, currentPage * pageSize)} of {totalItems} results
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ««
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          «
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">Page</span>
          <input
            type="text"
            value={pageInput}
            onChange={(e) => onPageInputChange(e.target.value)}
            onBlur={onPageInputBlur}
            className="w-16 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center"
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">of {totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          »
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          »»
        </button>
      </div>
    </div>
  );
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(30);
  const [pageInput, setPageInput] = useState('1');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, selectedRun]); // Refetch when filters change

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        action: 'getData',
        table: 'llm_evals',
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      });

      if (selectedRun) {
        params.append('runName', selectedRun);
      }

      const response = await fetch(`/api/db-viewer?${params}`);
      const result = await response.json();
      
      // Convert runtime_s to number and handle other fields
      const processedData = result.rows.map((row: RawLLMEval) => ({
        ...row,
        runtime_s: row.runtime_s ? Number(row.runtime_s) : 0,
        extracted_answers: Array.isArray(row.extracted_answers) ? row.extracted_answers : []
      }));
      
      setData(processedData);
      setTotalItems(result.totalCount);
      setTotalPages(result.totalPages);

      // Extract unique run names with proper typing
      const runs = [...new Set(processedData.map((row: LLMEval) => row.run_name))].filter((name): name is string => typeof name === 'string');
      setRunNames(runs);

      // Calculate min/max distinct answers for the current page
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

  const handleRowClick = (uuid: string) => {
    router.push(`/llm-evals/${uuid}`);
  };

  const handleMinDistinctChange = (value: string) => {
    const newMin = Math.max(0, Math.min(Number(value), distinctAnswersRange[1]));
    setDistinctAnswersRange([newMin, distinctAnswersRange[1]]);
  };

  const handleMaxDistinctChange = (value: string) => {
    const newMax = Math.max(distinctAnswersRange[0], Number(value));
    setDistinctAnswersRange([distinctAnswersRange[0], newMax]);
  };

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    setPageInput(validPage.toString());
  };

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
    const page = parseInt(value);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput);
    if (isNaN(page) || page < 1) {
      setPageInput('1');
      setCurrentPage(1);
    } else if (page > totalPages) {
      setPageInput(totalPages.toString());
      setCurrentPage(totalPages);
    }
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
            <div className="flex items-center gap-2">
              <div className="flex flex-col flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">Min</label>
                <input
                  type="number"
                  min={0}
                  max={distinctAnswersRange[1]}
                  value={distinctAnswersRange[0]}
                  onChange={(e) => handleMinDistinctChange(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">Max</label>
                <input
                  type="number"
                  min={distinctAnswersRange[0]}
                  value={distinctAnswersRange[1]}
                  onChange={(e) => handleMaxDistinctChange(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Range: {minDistinctAnswers} - {maxDistinctAnswers}
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
          {/* Top Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageInput={pageInput}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageInputChange={handlePageInputChange}
            onPageInputBlur={handlePageInputBlur}
          />

          <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-600">
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
                {data.map((row) => (
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

          {/* Bottom Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageInput={pageInput}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageInputChange={handlePageInputChange}
            onPageInputBlur={handlePageInputBlur}
          />
        </div>
      )}
    </div>
  );
} 