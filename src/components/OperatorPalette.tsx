import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { operatorCategories, categoryLabels } from '../data/operators';

interface OperatorPaletteProps {
  onOperatorDragStart: (operator: string) => void;
}

export default function OperatorPalette({ onOperatorDragStart }: OperatorPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['comparison_filtering', 'sorting_limiting', 'field_operations'])
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, operator: string) => {
    e.dataTransfer.setData('application/operator', operator);
    e.dataTransfer.effectAllowed = 'copy';
    onOperatorDragStart(operator);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl h-full flex flex-col overflow-hidden border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <h3 className="font-bold text-gray-900 text-lg">AQL Operators</h3>
        </div>
        <p className="text-xs text-gray-600 mt-1 font-medium">Drag operators to the builder area</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(operatorCategories).map(([category, operators]) => (
          <div key={category} className="mb-2">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span>{categoryLabels[category]}</span>
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedCategories.has(category) && (
              <div className="mt-2 space-y-1.5 ml-2">
                {operators.map((operator) => (
                  <div
                    key={operator}
                    draggable
                    onDragStart={(e) => handleDragStart(e, operator)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg cursor-move transition-all duration-200 group shadow-md hover:shadow-lg hover:scale-105"
                  >
                    <GripVertical className="w-3 h-3 flex-shrink-0" />
                    <span className="font-mono text-xs font-semibold truncate">{operator}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
