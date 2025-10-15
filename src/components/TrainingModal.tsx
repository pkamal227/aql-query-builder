import { useState } from 'react';
import { X, BookOpen, Save, Trash2 } from 'lucide-react';
import { trainingService } from '../services/trainingService';
import { TrainingSample } from '../lib/supabase';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TrainingModal({ isOpen, onClose, onSaved }: TrainingModalProps) {
  const [sampleType, setSampleType] = useState<'query' | 'sigma_rule' | 'log_snippet'>('query');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSamples, setSavedSamples] = useState<TrainingSample[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter sample content');
      return;
    }

    setSaving(true);
    try {
      await trainingService.saveTrainingSample(sampleType, content, description);
      setContent('');
      setDescription('');
      onSaved();
      alert('Training sample saved successfully!');
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const loadSavedSamples = async () => {
    const samples = await trainingService.getAllTrainingSamples();
    setSavedSamples(samples);
    setShowSaved(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training sample?')) return;

    const success = await trainingService.deleteTrainingSample(id);
    if (success) {
      setSavedSamples(samples => samples.filter(s => s.id !== id));
    }
  };

  const getSampleTypeLabel = (type: string) => {
    switch (type) {
      case 'query': return 'AQL Query';
      case 'sigma_rule': return 'Sigma Rule';
      case 'log_snippet': return 'Log Snippet';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Train from Use Case</h2>
                <p className="text-sm text-gray-600 mt-1">Save sample queries, rules, or logs to improve AI suggestions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showSaved ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sample Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSampleType('query')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sampleType === 'query'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold">AQL Query</div>
                    <div className="text-xs mt-1 opacity-75">Sample query syntax</div>
                  </button>
                  <button
                    onClick={() => setSampleType('sigma_rule')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sampleType === 'sigma_rule'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold">Sigma Rule</div>
                    <div className="text-xs mt-1 opacity-75">Detection rule</div>
                  </button>
                  <button
                    onClick={() => setSampleType('log_snippet')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sampleType === 'log_snippet'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold">Log Snippet</div>
                    <div className="text-xs mt-1 opacity-75">Example log data</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Failed login detection for Windows events"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sample Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    sampleType === 'query'
                      ? 'Paste your AQL query here...\n\nExample:\neventlog\n| where action = "login" and status = "failed"\n| where event_time earliest=-1h, latest=now\n| aggr count() as failed_attempts by user'
                      : sampleType === 'sigma_rule'
                      ? 'Paste your Sigma rule here...'
                      : 'Paste your log snippet here...'
                  }
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Saved Training Samples ({savedSamples.length})</h3>
                <button
                  onClick={() => setShowSaved(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to Add New
                </button>
              </div>

              {savedSamples.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No training samples saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedSamples.map((sample) => (
                    <div
                      key={sample.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            {getSampleTypeLabel(sample.sample_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(sample.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(sample.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {sample.description && (
                        <p className="text-sm font-medium text-gray-900 mb-2">{sample.description}</p>
                      )}
                      <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                        {sample.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          {!showSaved ? (
            <>
              <button
                onClick={loadSavedSamples}
                className="px-6 py-3 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold transition-colors"
              >
                View Saved Samples
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Sample'}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
