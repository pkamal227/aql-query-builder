import { useState } from 'react';
import { Send, Loader2, Key, CheckCircle, XCircle } from 'lucide-react';
import { Field, OperatorRule } from '../types';

interface AIAssistantProps {
  fields: Field[];
  onApplyQuery: (rules: OperatorRule[], originalQuery?: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  explanation?: string;
}

export default function AIAssistant({ fields, onApplyQuery }: AIAssistantProps) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [apiKeySet, setApiKeySet] = useState(!!localStorage.getItem('openai_api_key'));
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKeySet);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AQL Assistant. I can help you build queries using natural language. Just describe what you want to search for, and I'll create the AQL query for you.\n\nExamples:\n- Show me failed login attempts from the last hour\n- Count events by source IP and sort by count\n- Find top 10 users with the most activity"
    }
  ]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setApiKeySet(true);
      setShowApiKeyInput(false);
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setApiKeySet(false);
    setShowApiKeyInput(true);
  };

  const parseOperatorsFromResponse = (operators: any[]): OperatorRule[] => {
    return operators.map((op, index) => ({
      id: `${Date.now()}-${index}`,
      operator: op.operator,
      field: op.field || '',
      comparisonOperator: op.comparisonOperator || '=',
      value: op.value || '',
      aggregateFunction: op.aggregateFunction || 'count()',
      aggregateField: op.aggregateField || '',
      aliasName: op.aliasName || '',
      groupByFields: op.groupByFields || [],
    }));
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !apiKeySet) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
    };

    setMessages([...messages, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aql-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            fields: fields.map(f => f.name),
            apiKey: apiKey,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        // Check if this is a "no fields available" error
        if (errorData.needsClarification || errorData.error === 'No fields available') {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: errorData.explanation || errorData.error || 'Please upload a log file first so I can see what fields are available.',
          };
          setMessages(prev => [...prev, assistantMessage]);
          setLoading(false);
          return;
        }

        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check if AI needs clarification
      if (data.needsClarification) {
        const clarificationMessage: ChatMessage = {
          role: 'assistant',
          content: `${data.explanation || data.question}\n\n${
            data.suggestedFields && data.suggestedFields.length > 0
              ? `Suggested fields you could use:\n${data.suggestedFields.map((f: string) => `  • ${f}`).join('\n')}\n\nPlease clarify which field I should use.`
              : 'Please provide more details about which field to use.'
          }`,
        };
        setMessages(prev => [...prev, clarificationMessage]);
        setLoading(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.explanation || 'Here\'s your query:',
        query: data.query,
        explanation: data.explanation,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.operators && Array.isArray(data.operators)) {
        const rules = parseOperatorsFromResponse(data.operators);
        if (rules.length > 0) {
          onApplyQuery(rules, data.query);
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {showApiKeyInput && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <Key className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-2">OpenAI API Key Required</h4>
              <p className="text-sm text-yellow-800 mb-3">
                Enter your OpenAI API key to use the AI Assistant. Get one at{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  platform.openai.com
                </a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {apiKeySet && !showApiKeyInput && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">API Key configured</span>
          </div>
          <button
            onClick={handleRemoveApiKey}
            className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            Remove
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px] max-h-[500px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.query && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="bg-gray-900 rounded p-3">
                    <code className="text-xs text-green-400 font-mono break-all">
                      {message.query}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the query you want to build..."
            disabled={!apiKeySet || loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || !apiKeySet || loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
