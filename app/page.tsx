'use client';

import { useEffect, useState } from 'react';

interface TableInfo {
  table_name: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

interface TableRow {
  [key: string]: string | number | boolean | null;
}

export default function Home() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [schema, setSchema] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableInfo();
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/db-viewer?action=getTables');
      const data = await response.json();
      setTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchTableInfo = async () => {
    setLoading(true);
    try {
      const [schemaResponse, dataResponse] = await Promise.all([
        fetch(`/api/db-viewer?action=getSchema&table=${selectedTable}`),
        fetch(`/api/db-viewer?action=getData&table=${selectedTable}`)
      ]);
      
      const schemaData = await schemaResponse.json();
      const rowData = await dataResponse.json();
      
      setSchema(schemaData);
      setData(rowData);
    } catch (error) {
      console.error('Error fetching table info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100">Database Viewer</h1>
      
      <div className="mb-8">
        <select
          className="w-full max-w-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          <option value="">Select a table</option>
          {tables.map((table) => (
            <option key={table.table_name} value={table.table_name}>
              {table.table_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-600 dark:text-slate-300">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : selectedTable ? (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Schema</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Column Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Data Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                  {schema.map((col) => (
                    <tr key={col.column_name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{col.column_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{col.data_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Data</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700">
                    {schema.map((col) => (
                      <th key={col.column_name} className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                        {col.column_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      {schema.map((col) => (
                        <td key={col.column_name} className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                          {String(row[col.column_name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8">
          Select a table to view its schema and data
        </div>
      )}
    </div>
  );
}
