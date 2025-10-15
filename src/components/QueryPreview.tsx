import { Copy, Download, Save, Upload } from 'lucide-react';
import { useState } from 'react';

interface QueryPreviewProps {
  query: string;
  results: Array<Record<string, string>>;
  onSave: () => void;
  onLoad: () => void;
}

export default function QueryPreview({ query, results, onSave, onLoad }: QueryPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([query], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.aql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    const csv = convertToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: Array<Record<string, string>>): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((header) => `"${row[header] || ''}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Query Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Save query"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onLoad}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Load query"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">AQL Query</h3>
            <div className="flex gap-1">
              <button
                onClick={handleCopy}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Download query"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {copied && (
            <div className="text-xs text-green-600 mb-2">Copied to clipboard!</div>
          )}
          <div className="bg-gray-900 rounded-lg p-3 overflow-auto max-h-64">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {query || '| No query generated yet'}
            </pre>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Results <span className="text-gray-500 font-normal">({results.length})</span>
            </h3>
            {results.length > 0 && (
              <button
                onClick={handleDownloadResults}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Download results"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
            {results.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {Object.keys(results[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((value, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-2 text-gray-600 border-b border-gray-100 font-mono"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                No results to display
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
