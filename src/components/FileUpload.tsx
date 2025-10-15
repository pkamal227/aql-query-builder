import { useState } from 'react';
import { Upload, X, GripVertical } from 'lucide-react';
import Papa from 'papaparse';

export interface Field {
  name: string;
  type: string;
  sampleValue?: string;
}

interface FileUploadProps {
  onFieldsExtracted: (fields: Field[], data: Array<Record<string, any>>) => void;
  onFieldDragStart: (event: React.DragEvent, field: Field) => void;
}

export default function FileUpload({ onFieldsExtracted, onFieldDragStart }: FileUploadProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const detectFieldType = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'string';

    const str = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'timestamp';
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str)) return 'ip';
    if (/^\d{1,5}$/.test(str) && parseInt(str) <= 65535) return 'port';
    if (/^(true|false)$/i.test(str)) return 'boolean';
    if (/^[a-f0-9]{32,64}$/i.test(str)) return 'hash';
    if (!isNaN(Number(str)) && str !== '') return 'number';

    return 'string';
  };

  const reassembleJSONFromCSV = (data: any[]): any[] => {
    if (data.length === 0) return data;

    // Check if this is a Name/Value CSV with fragmented JSON
    const firstRow = data[0];
    if (!firstRow.Name || !firstRow.Value) return data;

    // Collect all rows and try to find JSON fragments
    let jsonString = '';
    const normalRows: any[] = [];

    data.forEach(row => {
      const name = String(row.Name || '').trim();
      const value = String(row.Value || '').trim();

      // Check if this row is part of a JSON object
      if (name.startsWith('"') || name.startsWith('{') || name === '}' || name === ']') {
        jsonString += name + '\n';
      } else if (name && value) {
        // Normal key-value pair
        normalRows.push(row);
      }
    });

    // Try to parse the collected JSON
    if (jsonString) {
      try {
        // Clean up the JSON string
        const cleanJson = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        const parsed = JSON.parse(cleanJson);

        // Merge parsed JSON with normal rows
        const merged: Record<string, any> = {};
        normalRows.forEach(row => {
          merged[row.Name] = row.Value;
        });

        // Flatten the parsed JSON into the merged object
        Object.assign(merged, parsed);

        return [merged];
      } catch {
        // If parsing fails, return original data
        return data;
      }
    }

    return data;
  };

  const parseCSVWithKeyValue = (data: any[]) => {
    const allFields = new Map<string, Field>();

    data.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        const strValue = String(value || '');

        if (strValue.includes(':')) {
          const pairs = strValue.split(',').map(p => p.trim());
          pairs.forEach(pair => {
            const [k, v] = pair.split(':').map(s => s.trim());
            if (k && v && !allFields.has(k)) {
              const cleanKey = k.replace(/^["']|["']$/g, '');
              const cleanValue = v.replace(/^["']|["']$/g, '');
              allFields.set(cleanKey, {
                name: cleanKey,
                type: detectFieldType(cleanValue),
                sampleValue: cleanValue
              });
            }
          });
        }

        const cleanKey = key.replace(/^["']|["']$/g, '');
        if (!allFields.has(cleanKey)) {
          allFields.set(cleanKey, {
            name: cleanKey,
            type: detectFieldType(value),
            sampleValue: strValue.substring(0, 50)
          });
        }
      });
    });

    return Array.from(allFields.values());
  };

  const processFile = (file: File) => {
    setFileName(file.name);

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const data = Array.isArray(json) ? json : [json];
          extractFields(data);
        } catch (error) {
          alert('Error parsing JSON file');
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        quoteChar: '"',
        escapeChar: '"',
        complete: (results) => {
          console.log('📄 CSV PARSING COMPLETE');
          console.log('Total rows parsed:', results.data.length);
          console.log('First 5 rows:', results.data.slice(0, 5));
          console.log('Last 5 rows:', results.data.slice(-5));

          // Check if CSV contains fragmented JSON and reassemble it
          const reassembled = reassembleJSONFromCSV(results.data);
          extractFields(reassembled);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          alert('Error parsing CSV file');
        },
      });
    } else {
      alert('Please upload a CSV or JSON file');
    }
  };

  const extractFields = (data: any[]) => {
    if (data.length === 0) return;

    const extractedFields = parseCSVWithKeyValue(data);
    setFields(extractedFields);
    onFieldsExtracted(extractedFields, data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearFile = () => {
    setFileName('');
    setFields([]);
    onFieldsExtracted([], []);
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      timestamp: 'bg-purple-100 text-purple-700',
      ip: 'bg-blue-100 text-blue-700',
      port: 'bg-cyan-100 text-cyan-700',
      boolean: 'bg-green-100 text-green-700',
      hash: 'bg-yellow-100 text-yellow-700',
      number: 'bg-orange-100 text-orange-700',
      string: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || colors.string;
  };

  return (
    <div className="border-t border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📁</span>
          <h3 className="text-base font-bold text-gray-900">Log File Upload</h3>
        </div>

        {!fileName ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 shadow-sm hover:shadow-md'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">
                Drop CSV or JSON file or <span className="text-blue-600 font-semibold">browse</span>
              </p>
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border-2 border-green-300 shadow-sm">
            <span className="text-sm text-gray-700 font-semibold truncate">{fileName}</span>
            <button
              onClick={clearFile}
              className="p-1.5 text-gray-500 hover:text-red-600 transition-all duration-200 ml-2 hover:scale-110"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {fields.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Available Fields ({fields.length})
          </h4>
          <p className="text-xs text-gray-500 mb-3">Drag fields into operator parameters</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {fields.map((field) => (
              <div
                key={field.name}
                draggable
                onDragStart={(e) => onFieldDragStart(e, field)}
                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-move transition-colors group"
                title={`${field.name} (${field.type})${field.sampleValue ? ': ' + field.sampleValue : ''}`}
              >
                <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-800 truncate">{field.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${getTypeColor(field.type)}`}>
                      {field.type}
                    </span>
                  </div>
                  {field.sampleValue && (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{field.sampleValue}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
