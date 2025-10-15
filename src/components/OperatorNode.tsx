import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, X } from 'lucide-react';

interface OperatorNodeData {
  operator: string;
  params: Record<string, string>;
  onUpdate?: (id: string, params: Record<string, string>) => void;
  onDelete?: (id: string) => void;
}

function OperatorNode({ id, data }: NodeProps<OperatorNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [localParams, setLocalParams] = useState(data.params);

  const handleSave = () => {
    if (data.onUpdate) {
      data.onUpdate(id, localParams);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldData = e.dataTransfer.getData('application/field');
    if (fieldData) {
      try {
        const field = JSON.parse(fieldData);
        const paramKey = getParamKey(data.operator);
        const currentValue = localParams[paramKey] || '';

        let newValue: string;
        if (data.operator === 'fields') {
          newValue = currentValue ? `${currentValue}, ${field.name}` : field.name;
        } else {
          newValue = currentValue ? `${currentValue} ${field.name}` : field.name;
        }

        setLocalParams({ ...localParams, [paramKey]: newValue });
      } catch (error) {
        console.error('Error parsing field data:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getParamKey = (operator: string): string => {
    const paramMap: Record<string, string> = {
      where: 'condition',
      calc: 'expression',
      fields: 'fields',
      sort: 'field',
      limit: 'count',
      head: 'count',
      tail: 'count',
      eval: 'expression',
      rex: 'pattern',
      extract: 'pattern',
      replace: 'pattern',
      top: 'field',
      rare: 'field',
      dedup: 'field',
      lookup: 'table',
      bin: 'field',
      fillnull: 'value',
    };
    return paramMap[operator] || 'value';
  };

  const paramKey = getParamKey(data.operator);
  const paramValue = localParams[paramKey] || '';

  return (
    <div
      className="bg-white rounded-lg border-2 border-gray-300 shadow-md min-w-[200px] hover:border-blue-400 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />

      <div className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-md flex items-center justify-between">
        <span className="font-mono font-semibold text-sm">{data.operator}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-blue-600 rounded transition-colors"
            title="Configure"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-500 rounded transition-colors"
            title="Delete"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2">
        {isEditing ? (
          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 mb-1">
              {data.operator === 'fields'
                ? 'Drop fields or type: field1, field2, field3 as alias'
                : 'Drop fields here or type manually'}
            </div>
            <textarea
              value={paramValue}
              onChange={(e) => setLocalParams({ ...localParams, [paramKey]: e.target.value })}
              placeholder={
                data.operator === 'fields'
                  ? 'src_ip, dst_port, user as username'
                  : `Enter ${paramKey}...`
              }
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              rows={3}
            />
            <button
              onClick={handleSave}
              className="w-full px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-600 font-mono break-words max-w-[250px]">
            {paramValue || <span className="text-gray-400 italic">No parameters set</span>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}

export default memo(OperatorNode);
