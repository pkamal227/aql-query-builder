import { Copy } from 'lucide-react';
import { useState } from 'react';

interface GeneratedQueryProps {
  query: string;
  results: Array<Record<string, string>>;
}

export default function GeneratedQuery({ query, results }: GeneratedQueryProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 h-full flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <h3 className="font-bold text-gray-900 text-lg">Generated AQL Query</h3>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Query'}
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-gray-900 rounded-xl p-6 shadow-inner">
            <pre className="text-base text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
              {query || 'where = ""'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
