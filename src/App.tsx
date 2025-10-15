import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import OperatorPalette from './components/OperatorPalette';
import VisualRuleBuilder from './components/VisualRuleBuilder';
import FieldsList from './components/FieldsList';
import GeneratedQuery from './components/GeneratedQuery';
import AIAssistant from './components/AIAssistant';
import TrainingModal from './components/TrainingModal';
import { Field, OperatorRule, BuilderMode } from './types';
import { executeAQLQuery } from './utils/queryExecutor';
import { parseAQLQuery } from './utils/queryParser';

// Persistence keys
const STORAGE_KEYS = {
  LOG_DATA: 'aql_builder_log_data',
  FIELDS: 'aql_builder_fields',
  RECORD_COUNT: 'aql_builder_record_count',
  RULES: 'aql_builder_rules',
  MANUAL_QUERY: 'aql_builder_manual_query',
  AI_QUERY: 'aql_builder_ai_query',
  MODE: 'aql_builder_mode',
};

function App() {
  // Initialize state with persisted data
  const [mode, setMode] = useState<BuilderMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE);
    return (saved as BuilderMode) || 'visual';
  });

  const [rules, setRules] = useState<OperatorRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RULES);
    return saved ? JSON.parse(saved) : [];
  });

  const [fields, setFields] = useState<Field[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FIELDS);
    return saved ? JSON.parse(saved) : [];
  });

  const [logData, setLogData] = useState<Array<Record<string, any>>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOG_DATA);
    return saved ? JSON.parse(saved) : [];
  });

  const [recordCount, setRecordCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORD_COUNT);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [manualQuery, setManualQuery] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.MANUAL_QUERY) || '';
  });

  const [aiGeneratedQuery, setAiGeneratedQuery] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AI_QUERY) || '';
  });

  const [results, setResults] = useState<Array<Record<string, string>>>([]);
  const [uploadSuccess, setUploadSuccess] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEYS.LOG_DATA);
  });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [queryExecuted, setQueryExecuted] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(fields));
  }, [fields]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOG_DATA, JSON.stringify(logData));
  }, [logData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORD_COUNT, recordCount.toString());
  }, [recordCount]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MANUAL_QUERY, manualQuery);
  }, [manualQuery]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AI_QUERY, aiGeneratedQuery);
  }, [aiGeneratedQuery]);

  const generateQuery = (): string => {
    if (rules.length === 0) return '|where = ""';

    return rules
      .map((rule) => {
        if (rule.operator === 'where' || rule.operator === 'cofilter') {
          if (rule.whereConditions && rule.whereConditions.length > 0) {
            const conditions = rule.whereConditions
              .map((cond, index) => {
                // Check if value already has quotes or is an expression
                const needsQuotes = !cond.value.startsWith('"') && !cond.value.includes('(') && cond.operator !== 'in' && cond.operator !== 'not in';
                const formattedValue = needsQuotes ? `"${cond.value}"` : cond.value;
                const condStr = `${cond.field} ${cond.operator} ${formattedValue}`;
                if (index === 0) return condStr;
                return `${(cond.logicalOperator || 'AND').toLowerCase()} ${condStr}`;
              })
              .join(' ');
            return `${rule.operator} ${conditions}`;
          } else {
            const field = rule.field || '';
            const operator = rule.comparisonOperator || '=';
            const value = rule.value || '';
            const needsQuotes = !value.startsWith('"') && !value.includes('(');
            const formattedValue = needsQuotes ? `"${value}"` : value;
            return `${rule.operator} ${field} ${operator} ${formattedValue}`;
          }
        }

        if (['aggr', 'timetrend', 'eventstats'].includes(rule.operator)) {
          const func = rule.aggregateFunction || 'count';
          const aggField = rule.aggregateField || '';
          // Build function call: count() or count(field) or sum(field)
          // For count: aggField can be empty (count()) or filled (count(field))
          // For other functions: aggField required
          const funcWithField = aggField ? `${func}(${aggField})` : `${func}()`;
          const alias = rule.aliasName ? ` as ${rule.aliasName}` : '';
          const groupBy = (rule.groupByFields && rule.groupByFields.length > 0 && rule.groupByFields.some(f => f))
            ? ` by ${rule.groupByFields.filter(f => f).join(', ')}`
            : '';

          // timetrend needs span parameter
          if (rule.operator === 'timetrend') {
            const span = rule.value ? ` span=${rule.value}` : '';
            return `${rule.operator} ${funcWithField}${groupBy}${span}`;
          }

          return `${rule.operator} ${funcWithField}${alias}${groupBy}`;
        }

        if (rule.operator === 'top' || rule.operator === 'rare') {
          const field = rule.field || '';
          const limit = rule.value ? ` ${rule.value}` : '';
          return `${rule.operator}${limit} ${field}`;
        }

        if (rule.operator === 'sort') {
          const field = rule.field || '';
          const order = rule.value || 'asc';
          return `sort ${field} ${order}`;
        }
        if (rule.operator === 'limit') {
          return `limit ${rule.value || '10'}`;
        }
        if (rule.operator === 'head') {
          return `head ${rule.value || '10'}`;
        }
        if (rule.operator === 'tail') {
          return `tail ${rule.value || '10'}`;
        }
        if (rule.operator === 'calc' || rule.operator === 'eval') {
          const fieldName = rule.field === '__custom__'
            ? (rule.customFieldName || 'result')
            : (rule.field || 'result');
          const expression = rule.value || '';
          return `${rule.operator} ${fieldName} = ${expression}`;
        }
        if (rule.operator === 'fields') {
          if (rule.fieldSelections && rule.fieldSelections.length > 0) {
            const fieldsList = rule.fieldSelections
              .filter(sel => sel.field)
              .map(sel => sel.alias ? `${sel.field} as ${sel.alias}` : sel.field)
              .join(', ');
            return `fields ${fieldsList}`;
          }
          return `fields ${rule.field || ''}`;
        }
        if (rule.operator === 'dedup' || rule.operator === 'uniq') {
          if (rule.fieldSelections && rule.fieldSelections.length > 0) {
            const fieldsList = rule.fieldSelections
              .filter(sel => sel.field)
              .map(sel => sel.field)
              .join(', ');
            return `${rule.operator} ${fieldsList}`;
          }
          return `${rule.operator} ${rule.field || ''}`;
        }

        if (rule.operator === 'lookup') {
          // |lookup <table> on <lookup_field> <operator> <event_field> output <fields>
          const table = rule.lookupTable || 'table';

          // Build condition from structured format or fall back to legacy string
          let condition = 'field=field';
          if (rule.lookupJoinCondition) {
            const { lookupField, operator, eventField } = rule.lookupJoinCondition;
            condition = `${lookupField} ${operator} ${eventField}`;
          } else if (rule.lookupCondition) {
            condition = rule.lookupCondition;
          }

          const outputFields = rule.lookupOutputFields || [];
          const outputStr = outputFields
            .filter(f => f.field)
            .map(f => f.alias ? `${f.field} as ${f.alias}` : f.field)
            .join(', ');
          return `lookup ${table} on ${condition} output ${outputStr || 'field'}`;
        }

        if (rule.operator === 'iplocation') {
          const field = rule.field || 'src_ip';
          const prefix = rule.value ? `prefix=${rule.value} ` : '';
          return `iplocation ${prefix}${field}`;
        }

        if (rule.operator === 'whois') {
          const field = rule.field || 'domain';
          return `whois ${field}`;
        }

        if (rule.operator === 'fieldsummary') {
          const field = rule.field || '';
          return `fieldsummary ${field}`;
        }

        if (rule.operator === 'fillnull') {
          const value = rule.value ? `value=${rule.value} ` : '';
          if (rule.fieldSelections && rule.fieldSelections.length > 0) {
            const fieldsList = rule.fieldSelections
              .filter(sel => sel.field)
              .map(sel => sel.field)
              .join(', ');
            return `fillnull ${value}${fieldsList}`;
          }
          const field = rule.field || '';
          return `fillnull ${value}${field}`;
        }

        if (rule.operator === 'filldown') {
          if (rule.fieldSelections && rule.fieldSelections.length > 0) {
            const fieldsList = rule.fieldSelections
              .filter(sel => sel.field)
              .map(sel => sel.field)
              .join(', ');
            return `filldown ${fieldsList}`;
          }
          const field = rule.field || '';
          return `filldown ${field}`;
        }

        if (rule.operator === 'makemv') {
          const delim = rule.value ? `delim="${rule.value}" ` : 'delim="," ';
          const field = rule.field || '';
          return `makemv ${delim}${field}`;
        }

        if (rule.operator === 'mvcombine') {
          const field = rule.field || '';
          return `mvcombine ${field}`;
        }

        if (rule.operator === 'mvexpand') {
          const field = rule.field || '';
          return `mvexpand ${field}`;
        }

        if (rule.operator === 'nomv') {
          const field = rule.field || '';
          return `nomv ${field}`;
        }

        return rule.operator;
      })
      .map((line, index) => `|${line}`)
      .join('\n');
  };

  const handleDropOperator = (operator: string) => {
    const newRule: OperatorRule = {
      id: Date.now().toString(),
      operator,
      field: '',
      comparisonOperator: '=',
      value: '',
      whereConditions: operator === 'where' ? [{ field: '', operator: '=', value: '' }] : undefined,
    };
    setRules([...rules, newRule]);
  };

  const handleUpdateRule = (id: string, updates: Partial<OperatorRule>) => {
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id));
  };

  const handleReorderRule = (id: string, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex((rule) => rule.id === id);
    if (currentIndex === -1) return;

    const newRules = [...rules];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= newRules.length) return;

    // Swap elements
    [newRules[currentIndex], newRules[targetIndex]] = [newRules[targetIndex], newRules[currentIndex]];
    setRules(newRules);
  };

  const handleClearAll = () => {
    // Clear all state
    setRules([]);
    setResults([]);
    setManualQuery('');
    setAiGeneratedQuery('');
    setValidationResult(null);
    setQueryExecuted(false);
    setExecutionMessage(null);
    setFields([]);
    setLogData([]);
    setRecordCount(0);
    setUploadSuccess(false);

    // Clear all persisted data except API key
    localStorage.removeItem(STORAGE_KEYS.LOG_DATA);
    localStorage.removeItem(STORAGE_KEYS.FIELDS);
    localStorage.removeItem(STORAGE_KEYS.RECORD_COUNT);
    localStorage.removeItem(STORAGE_KEYS.RULES);
    localStorage.removeItem(STORAGE_KEYS.MANUAL_QUERY);
    localStorage.removeItem(STORAGE_KEYS.AI_QUERY);
    localStorage.removeItem(STORAGE_KEYS.MODE);
  };

  const handleExecuteQuery = () => {
    if (logData.length === 0) {
      setExecutionMessage({ type: 'error', text: 'Please upload a log file first' });
      return;
    }

    console.log('Executing query:', query);
    console.log('Total log records:', logData.length);

    try {
      const executedResults = executeAQLQuery(query, logData);
      console.log('Query executed successfully. Results:', executedResults.length);

      if (executedResults.length === 0) {
        console.warn('Query returned 0 results. This may be expected or indicate an issue.');
        console.log('Sample data row:', logData[0]);
        console.log('Available fields:', Object.keys(logData[0]));
      }

      setResults(executedResults);
      setQueryExecuted(true);

      if (executedResults.length === 0) {
        setExecutionMessage({
          type: 'info',
          text: `Query executed successfully but returned 0 results. This could mean:\n• No records match your filter criteria\n• The field name might be case-sensitive or incorrect\n• Check console (F12) to see available fields`
        });
      } else {
        setExecutionMessage({ type: 'success', text: `Query executed successfully! Found ${executedResults.length} result(s).` });
      }
    } catch (error: any) {
      setExecutionMessage({ type: 'error', text: `Error: ${error.message}` });
      console.error('Query execution error:', error);
      setQueryExecuted(true);
    }
  };

  const transformKeyValueData = (data: Array<Record<string, any>>): Array<Record<string, any>> => {
    console.log('🔄 TRANSFORM FUNCTION CALLED - VERSION 3.0');

    // Check if data is in Name/Value key-value format
    if (data.length > 0 && data[0].Name && data[0].Value !== undefined) {
      console.log('Detected Name/Value key-value format. Transforming...');

      // Separate regular key-value pairs from JSON fragments
      const regularPairs: Array<{key: string, value: any}> = [];
      const jsonFragments: string[] = [];

      data.forEach(row => {
        const name = String(row.Name || '').trim();
        const value = row.Value;

        if (!name) return;

        // Detect JSON fragments (lines that look like JSON but have empty/whitespace values)
        const isJsonFragment = (
          name.startsWith('"') ||
          name.startsWith('{') ||
          name.startsWith('}') ||
          name.startsWith('[') ||
          name.startsWith(']') ||
          (name.includes('":') && name.startsWith('"'))
        );

        if (isJsonFragment) {
          jsonFragments.push(name);
        } else {
          // Regular key-value pair
          regularPairs.push({ key: name, value });
        }
      });

      console.log(`Found ${regularPairs.length} regular pairs and ${jsonFragments.length} JSON fragments`);

      // Build the transformed object from regular pairs
      const transformed: Record<string, any> = {};

      regularPairs.forEach(({ key, value }) => {
        // Try to parse JSON values
        if (typeof value === 'string') {
          const trimmedValue = value.trim();

          // Check if it looks like JSON
          if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
            try {
              value = JSON.parse(trimmedValue);
            } catch {
              // Keep as string if not valid JSON
            }
          }
        }

        transformed[key] = value;
      });

      // Try to reconstruct and parse the JSON fragments
      if (jsonFragments.length > 0) {
        console.log('Attempting to parse JSON fragments...');
        const jsonString = jsonFragments.join('\n');

        try {
          const parsed = JSON.parse(jsonString);
          console.log('Successfully parsed JSON fragments:', parsed);

          // Flatten the parsed JSON into transformed object
          const flattenObject = (obj: any, prefix = ''): void => {
            Object.entries(obj).forEach(([k, v]) => {
              const newKey = prefix ? `${prefix}.${k}` : k;

              if (v && typeof v === 'object' && !Array.isArray(v)) {
                flattenObject(v, newKey);
              } else {
                transformed[newKey] = v;
              }
            });
          };

          flattenObject(parsed);
        } catch (error) {
          console.warn('Could not parse JSON fragments:', error);
        }
      }

      console.log('Transformed data:', transformed);
      console.log('Available keys:', Object.keys(transformed));
      return [transformed]; // Return as single row
    }

    // Check if data has JSON-like field names (e.g., '"tenantId": "value"')
    if (data.length > 0) {
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      const jsonLikeFields = keys.filter(k => k.startsWith('"') && k.includes('":'));

      console.log(`Checking for JSON-like fields. Found ${jsonLikeFields.length} out of ${keys.length} total fields`);

      if (jsonLikeFields.length > 10) {  // Need significant number to be sure it's this format
        console.log('Detected JSON-like field names. Parsing...');
        console.log('Sample JSON-like fields:', jsonLikeFields.slice(0, 3));

        // Transform each row by parsing JSON-like field names
        return data.map(row => {
          const parsed: Record<string, any> = {};

          Object.entries(row).forEach(([key, value]) => {
            // Check if key looks like a JSON key-value pair: "fieldName": "value"
            if (key.startsWith('"') && key.includes('":')) {
              const colonIndex = key.indexOf('":');
              const fieldName = key.substring(1, colonIndex);  // Extract between quotes

              // The value in the key doesn't matter - use the actual cell value
              parsed[fieldName] = value;
            } else {
              // Normal field - keep as is
              parsed[key] = value;
            }
          });

          return parsed;
        });
      }
    }

    return data;
  };

  const handleFieldsExtracted = (extractedFields: Field[], data: Array<Record<string, any>>) => {
    console.log('=== RAW EXTRACTED DATA ===');
    console.log('First 3 rows:', data.slice(0, 3));
    console.log('Total rows:', data.length);
    console.log('Fields from first row:', Object.keys(data[0] || {}));

    // Transform key-value format if needed
    const transformedData = transformKeyValueData(data);

    console.log('=== TRANSFORMED DATA ===');
    console.log('Transformed rows:', transformedData.length);
    console.log('First transformed row:', transformedData[0]);
    console.log('Keys in transformed row:', Object.keys(transformedData[0] || {}));

    // Extract fields from transformed data
    const finalFields = extractFieldsFromData(transformedData);
    console.log('Final fields:', finalFields.map(f => f.name));

    setFields(finalFields);
    setLogData(transformedData);
    setRecordCount(transformedData.length);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 5000);
  };

  const extractFieldsFromData = (data: Array<Record<string, any>>): Field[] => {
    if (data.length === 0) return [];

    const fieldsMap = new Map<string, Field>();

    data.forEach(row => {
      Object.entries(row).forEach(([key, value]) => {
        if (!fieldsMap.has(key)) {
          const type = typeof value === 'number' ? 'number' :
                      typeof value === 'boolean' ? 'boolean' :
                      'string';

          fieldsMap.set(key, {
            name: key,
            type,
            sampleValue: String(value).substring(0, 50)
          });
        }
      });
    });

    return Array.from(fieldsMap.values());
  };

  const handleApplyAIQuery = (aiRules: OperatorRule[], originalQuery?: string) => {
    setRules(aiRules);
    if (originalQuery) {
      setAiGeneratedQuery(originalQuery);
    }
  };

  const handleApplyAIFix = () => {
    if (!validationResult) {
      console.error('No validation result available');
      return;
    }

    console.log('🔧 Apply AI Fix - Validation Result:', validationResult);

    let correctedQuery = validationResult.correctedQuery;
    console.log('📝 Corrected Query from validationResult:', correctedQuery);

    if (!correctedQuery && validationResult.suggestions && validationResult.suggestions.length > 0) {
      const suggestionText = validationResult.suggestions.join(' ');

      const explicitQueryMatch = suggestionText.match(/(?:should be|corrected query should be|query should be):\s*(.+?)(?:\.|$)/i);
      if (explicitQueryMatch) {
        correctedQuery = explicitQueryMatch[1].trim();
        console.log('📝 Extracted from suggestions:', correctedQuery);
      } else {
        correctedQuery = applySuggestionsToQuery(query, validationResult.suggestions, validationResult.errors || []);
        console.log('📝 Applied suggestions to query:', correctedQuery);
      }
    }

    // If no corrected query available at all, show alert
    if (!correctedQuery) {
      alert('Unable to automatically fix the query. Please manually apply the suggestions:\n\n' +
            (validationResult.suggestions || []).join('\n'));
      return;
    }

    console.log('✅ Original query:', query);
    console.log('✅ Corrected query:', correctedQuery);

    // Always apply the corrected query to the Generated Query panel
    try {
      const parsedRules = parseAQLQuery(correctedQuery);
      console.log('🔍 Parsed rules:', parsedRules);

      if (parsedRules.length > 0) {
        console.log('✅ Setting rules to:', parsedRules);
        setRules(parsedRules);
        if (mode === 'manual') {
          setMode('visual');
        }
        setValidationResult(null);
      } else {
        console.log('⚠️ No rules parsed, applying to manual query');
        setManualQuery(correctedQuery);
        setMode('manual');
        setValidationResult(null);
      }
    } catch (error) {
      console.error('❌ Error parsing query, applying to manual query:', error);
      setManualQuery(correctedQuery);
      setMode('manual');
      setValidationResult(null);
    }
  };

  const applySuggestionsToQuery = (originalQuery: string, suggestions: string[], errors: string[]): string => {
    let fixed = originalQuery;

    const allText = [...suggestions, ...errors].join(' ');

    if (allText.toLowerCase().includes('remove quotes') || allText.toLowerCase().includes('should not be enclosed in quotes')) {
      const patterns = [
        /(?:field|around|for field)\s+['"]*(\w+)['"]*\s+(?:should not|it should)/i,
        /['"]*(\w+)['"]*\s+should not be enclosed/i,
        /quotes (?:around|for) ['"]*(\w+)['"]/i
      ];

      for (const pattern of patterns) {
        const fieldMatch = allText.match(pattern);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          fixed = fixed.replace(new RegExp(`["'](${fieldName})["']\\s*(=|!=|<|>|<=|>=|contains|in)`, 'gi'), `$1 $2`);
          console.log('Fixed field:', fieldName, 'in query');
          break;
        }
      }
    }

    if (allText.toLowerCase().includes('add quotes') || allText.toLowerCase().includes('should be enclosed in quotes')) {
      const valueMatch = allText.match(/value[s]?\s+['"]*(\w+)['"]*\s+should be/i);
      if (valueMatch) {
        const value = valueMatch[1];
        fixed = fixed.replace(new RegExp(`(=|!=|<|>|<=|>=|contains|in)\\s*(${value})\\b(?!["])`, 'gi'), `$1 "${value}"`);
      }
    }

    return fixed;
  };

  const generatedQuery = generateQuery();
  const query = mode === 'manual' ? manualQuery : (mode === 'ai' && aiGeneratedQuery) ? aiGeneratedQuery : generatedQuery;

  const handleModeChange = (newMode: BuilderMode) => {
    if (newMode === 'manual' && mode !== 'manual') {
      setManualQuery(generatedQuery);
    }
    setMode(newMode);
  };

  const handleValidateQuery = async () => {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please configure your OpenAI API key in the AI Assistant first.');
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aql-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'validate',
            query: query,
            fields: fields.map(f => f.name),
            apiKey: apiKey,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setValidationResult(data);
    } catch (error: any) {
      setValidationResult({
        valid: false,
        errors: [error.message || 'Failed to validate query'],
        warnings: [],
        explanation: '',
        suggestions: []
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
            AQL Query Builder
          </h1>
          <p className="text-lg text-gray-600 font-medium">Build powerful analytics queries with visual tools and AI assistance</p>
        </div>
        {uploadSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-lg animate-fade-in">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <span className="font-semibold text-lg">File uploaded successfully! Records: {recordCount}</span>
              <div className="text-sm text-emerald-700 mt-1 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Data persisted - will survive page refresh
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">AQL Query Builder</h2>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleModeChange('visual')}
              className={`px-6 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 ${
                mode === 'visual'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-105 ring-4 ring-blue-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-blue-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
              Visual Builder
            </button>
            <button
              onClick={() => handleModeChange('manual')}
              className={`px-6 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 ${
                mode === 'manual'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-105 ring-4 ring-blue-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-blue-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Editor
            </button>
            <button
              onClick={() => handleModeChange('ai')}
              className={`px-6 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-105 ring-4 ring-blue-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-blue-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Assistant
            </button>
            <button
              onClick={() => setShowTrainingModal(true)}
              className="px-6 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 bg-white text-green-600 hover:bg-green-50 hover:shadow-lg border-2 border-green-200 hover:border-green-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Train from Use Case
            </button>
            <button
              onClick={handleClearAll}
              className="px-6 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 bg-white text-red-600 hover:bg-red-50 hover:shadow-lg border-2 border-red-200 hover:border-red-400 ml-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <div className="h-[500px]">
              <OperatorPalette onOperatorDragStart={() => {}} />
            </div>

            <div className="h-[400px]">
              <FieldsList fields={fields} />
            </div>
          </div>

          <div className="col-span-9 space-y-6">
            {mode === 'ai' ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🤖</span>
                      <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
                    </div>
                    <AIAssistant fields={fields} onApplyQuery={handleApplyAIQuery} />
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">📐</span>
                      <h3 className="text-lg font-bold text-gray-900">Visual Rule Builder</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[600px]">
                      <VisualRuleBuilder
                        rules={rules}
                        fields={fields}
                        onAddRule={() => {}}
                        onUpdateRule={handleUpdateRule}
                        onRemoveRule={handleRemoveRule}
                        onDrop={handleDropOperator}
                        onReorderRule={handleReorderRule}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[400px]">
                  <GeneratedQuery query={query} results={results} />
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">📐</span>
                    <h3 className="text-xl font-bold text-gray-900">
                      {mode === 'visual' ? 'Visual Rule Builder' : 'Manual Editor'}
                    </h3>
                  </div>

                  {mode === 'visual' ? (
                    <VisualRuleBuilder
                      rules={rules}
                      fields={fields}
                      onAddRule={() => {}}
                      onUpdateRule={handleUpdateRule}
                      onRemoveRule={handleRemoveRule}
                      onDrop={handleDropOperator}
                      onReorderRule={handleReorderRule}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="font-medium mb-1">💡 Manual Editor</p>
                        <p className="text-xs">Edit the query directly. Changes made here will be used when you execute the query.</p>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                        <textarea
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                          className="w-full h-64 p-4 font-mono text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white resize-none"
                          placeholder="Enter your AQL query manually...&#10;&#10;Example:&#10;where status = &quot;failed&quot;&#10;| aggr count() as total by user&#10;| sort total desc&#10;| limit 10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 mt-6">
                    <div className="flex gap-3">
                      <button
                        onClick={handleValidateQuery}
                        disabled={validating || !query || query === 'where = ""'}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        <span>✓</span>
                        {validating ? 'Validating...' : 'Validate with AI'}
                      </button>
                    </div>

                    {executionMessage && (
                      <div className={`p-4 rounded-lg border-2 ${
                        executionMessage.type === 'success'
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : executionMessage.type === 'error'
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xl flex-shrink-0">
                            {executionMessage.type === 'success' ? '✅' : executionMessage.type === 'error' ? '❌' : 'ℹ️'}
                          </span>
                          <div className="flex-1">
                            <pre className="text-sm whitespace-pre-wrap font-sans">{executionMessage.text}</pre>
                          </div>
                          <button
                            onClick={() => setExecutionMessage(null)}
                            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {validationResult && (
                      <div className={`p-4 rounded-lg border-2 ${
                        validationResult.valid
                          ? 'bg-green-50 border-green-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{validationResult.valid ? '✅' : '❌'}</span>
                          <h4 className="font-bold text-gray-900">
                            {validationResult.valid ? 'Query is Valid' : 'Query has Issues'}
                          </h4>
                        </div>

                        {validationResult.explanation && (
                          <p className="text-sm text-gray-700 mb-3">{validationResult.explanation}</p>
                        )}

                        {validationResult.errors && validationResult.errors.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-red-800 mb-1">Errors:</p>
                            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                              {validationResult.errors.map((error: string, i: number) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {validationResult.warnings && validationResult.warnings.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-yellow-800 mb-1">Warnings:</p>
                            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                              {validationResult.warnings.map((warning: string, i: number) => (
                                <li key={i}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-blue-800 mb-1">Suggestions:</p>
                            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                              {validationResult.suggestions.map((suggestion: string, i: number) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {validationResult.correctedQuery && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold text-blue-800 mb-2">Corrected Query:</p>
                            <code className="text-xs text-blue-900 font-mono block bg-white p-2 rounded border border-blue-100 whitespace-pre-wrap break-all">
                              {validationResult.correctedQuery}
                            </code>
                          </div>
                        )}

                        {!validationResult.valid && (validationResult.correctedQuery || validationResult.suggestions) && (
                          <div className="mt-4 pt-4 border-t border-red-200">
                            <button
                              onClick={handleApplyAIFix}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-md"
                            >
                              <span>🔧</span>
                              {validationResult.correctedQuery ? 'Apply AI Fix' : 'Try to Extract Fix from Suggestions'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-[400px]">
                  <GeneratedQuery query={query} results={results} onExecute={handleExecuteQuery} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <FileUpload onFieldsExtracted={handleFieldsExtracted} onFieldDragStart={() => {}} />
        </div>
      </div>

      <TrainingModal
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        onSaved={() => {
          console.log('Training sample saved successfully');
        }}
      />
    </div>
  );
}

export default App;
