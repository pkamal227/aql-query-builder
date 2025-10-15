import { useState, useRef, useEffect } from 'react';
import { Field } from '../types';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  fields: Field[];
  placeholder?: string;
  className?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  fields,
  placeholder = 'Type or select field...',
  className = '',
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredFields, setFilteredFields] = useState<Field[]>(fields);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = fields.filter(field =>
      field.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredFields(filtered);
    setSelectedIndex(0);
  }, [value, fields]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectField = (fieldName: string) => {
    onChange(fieldName);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredFields.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredFields.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFields[selectedIndex]) {
          handleSelectField(filteredFields[selectedIndex].name);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
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
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className}`}
        autoComplete="off"
      />

      {showSuggestions && filteredFields.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredFields.map((field, index) => (
            <div
              key={field.name}
              onClick={() => handleSelectField(field.name)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-purple-100 text-purple-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-gray-800 truncate">
                  {field.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${getTypeColor(
                    field.type
                  )}`}
                >
                  {field.type}
                </span>
              </div>
              {field.sampleValue && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {field.sampleValue}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showSuggestions && filteredFields.length === 0 && value && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
        >
          <div className="px-3 py-2 text-sm text-gray-500 italic">
            No matching fields found
          </div>
        </div>
      )}
    </div>
  );
}
