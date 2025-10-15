import { Field } from '../types';

interface FieldsListProps {
  fields: Field[];
}

export default function FieldsList({ fields }: FieldsListProps) {
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      timestamp: 'bg-purple-100 text-purple-700',
      ip: 'bg-blue-100 text-blue-700',
      port: 'bg-cyan-100 text-cyan-700',
      boolean: 'bg-green-100 text-green-700',
      hash: 'bg-yellow-100 text-yellow-700',
      number: 'bg-orange-100 text-orange-700',
      string: 'bg-emerald-100 text-emerald-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const handleDragStart = (e: React.DragEvent, field: Field) => {
    e.dataTransfer.setData('application/field', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📄</span>
          <h3 className="font-bold text-gray-900 text-lg">Available Fields</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {fields.length > 0 ? (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.name}
                draggable
                onDragStart={(e) => handleDragStart(e, field)}
                className={`p-3 rounded-lg ${getTypeColor(field.type)} cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md`}
              >
                <div className="font-semibold text-sm">{field.name}</div>
                <div className="text-xs opacity-75 mt-1">
                  {field.type} {field.sampleValue && `• ${field.sampleValue.substring(0, 30)}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Upload a file to see fields
          </div>
        )}
      </div>
    </div>
  );
}
