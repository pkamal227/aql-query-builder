import { X, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { OperatorRule, Field, WhereCondition, FieldSelection } from '../types';
import { operators, comparisonOperators, aggregateFunctions, timetrend_eventstats_functions } from '../data/operators';
import AutocompleteInput from './AutocompleteInput';

interface VisualRuleBuilderProps {
  rules: OperatorRule[];
  fields: Field[];
  onAddRule: (rule: OperatorRule) => void;
  onUpdateRule: (id: string, updates: Partial<OperatorRule>) => void;
  onRemoveRule: (id: string) => void;
  onDrop: (operator: string) => void;
  onReorderRule?: (id: string, direction: 'up' | 'down') => void;
}

export default function VisualRuleBuilder({
  rules,
  fields,
  onUpdateRule,
  onRemoveRule,
  onDrop,
  onReorderRule,
}: VisualRuleBuilderProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const operator = e.dataTransfer.getData('application/operator');
    if (operator) {
      onDrop(operator);
    }
  };

  const getOperatorConfig = (operatorName: string) => {
    return operators[operatorName];
  };

  const isAggregationOperator = (operator: string) => {
    return ['aggr', 'timetrend', 'eventstats', 'top', 'rare'].includes(operator);
  };

  const addGroupByField = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      const currentFields = rule.groupByFields || [];
      onUpdateRule(ruleId, { groupByFields: [...currentFields, ''] });
    }
  };

  const removeGroupByField = (ruleId: string, index: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.groupByFields) {
      const newFields = rule.groupByFields.filter((_, i) => i !== index);
      onUpdateRule(ruleId, { groupByFields: newFields });
    }
  };

  const updateGroupByField = (ruleId: string, index: number, value: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.groupByFields) {
      const newFields = [...rule.groupByFields];
      newFields[index] = value;
      onUpdateRule(ruleId, { groupByFields: newFields });
    }
  };

  const addWhereCondition = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      const currentConditions = rule.whereConditions || [];
      const newCondition: WhereCondition = {
        field: '',
        operator: '=',
        value: '',
        logicalOperator: 'AND'
      };
      onUpdateRule(ruleId, { whereConditions: [...currentConditions, newCondition] });
    }
  };

  const removeWhereCondition = (ruleId: string, index: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.whereConditions) {
      const newConditions = rule.whereConditions.filter((_, i) => i !== index);
      onUpdateRule(ruleId, { whereConditions: newConditions });
    }
  };

  const updateWhereCondition = (ruleId: string, index: number, updates: Partial<WhereCondition>) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.whereConditions) {
      const newConditions = [...rule.whereConditions];
      newConditions[index] = { ...newConditions[index], ...updates };
      onUpdateRule(ruleId, { whereConditions: newConditions });
    }
  };

  const addFieldSelection = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      const currentSelections = rule.fieldSelections || [];
      const newSelection: FieldSelection = { field: '', alias: '' };
      onUpdateRule(ruleId, { fieldSelections: [...currentSelections, newSelection] });
    }
  };

  const removeFieldSelection = (ruleId: string, index: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.fieldSelections) {
      const newSelections = rule.fieldSelections.filter((_, i) => i !== index);
      onUpdateRule(ruleId, { fieldSelections: newSelections });
    }
  };

  const updateFieldSelection = (ruleId: string, index: number, updates: Partial<FieldSelection>) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.fieldSelections) {
      const newSelections = [...rule.fieldSelections];
      newSelections[index] = { ...newSelections[index], ...updates };
      onUpdateRule(ruleId, { fieldSelections: newSelections });
    }
  };

  const renderOperatorFields = (rule: OperatorRule) => {
    const config = getOperatorConfig(rule.operator);

    if (!config) {
      return (
        <div className="text-sm text-gray-500 italic">
          Operator configuration not found. Please check operator definition.
        </div>
      );
    }

    // Handle aggregation operators with special UI
    if (isAggregationOperator(rule.operator)) {
      const functionsForOperator = rule.operator === 'timetrend' || rule.operator === 'eventstats'
        ? (rule.operator === 'eventstats' ? ['count', 'sum', 'avg', 'min', 'max'] : timetrend_eventstats_functions)
        : aggregateFunctions;

      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aggregation Function
            </label>
            <select
              value={rule.aggregateFunction || 'count'}
              onChange={(e) => onUpdateRule(rule.id, { aggregateFunction: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {functionsForOperator.map((func) => (
                <option key={func} value={func}>
                  {func}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {rule.aggregateFunction === 'count'
                ? 'count() or count(field) - field is optional for count'
                : 'Field is required for this function'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field {rule.aggregateFunction === 'count' ? '(optional)' : '(required)'}
            </label>
            <AutocompleteInput
              value={rule.aggregateField || ''}
              onChange={(value) => onUpdateRule(rule.id, { aggregateField: value })}
              fields={fields}
              placeholder={rule.aggregateFunction === 'count'
                ? 'Leave blank for count() or select for count(field)'
                : 'Type or select field...'}
            />
          </div>

          {(rule.operator === 'aggr' || rule.operator === 'eventstats') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alias (as) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={rule.aliasName || ''}
                onChange={(e) => onUpdateRule(rule.id, { aliasName: e.target.value })}
                placeholder="e.g., total, count_user, avg_time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {rule.operator === 'timetrend' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Span <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={rule.value || ''}
                onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
                placeholder="e.g., 1h, 5m, 1d"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {(rule.operator === 'top' || rule.operator === 'rare') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Count (optional, default 10)
                </label>
                <input
                  type="number"
                  value={rule.value || ''}
                  onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
                  placeholder="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field <span className="text-red-500">*</span>
                </label>
                <AutocompleteInput
                  value={rule.field || ''}
                  onChange={(value) => onUpdateRule(rule.id, { field: value })}
                  fields={fields}
                  placeholder="Field to analyze..."
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Group By Fields (optional)
              </label>
              <button
                onClick={() => addGroupByField(rule.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>
            <div className="space-y-2">
              {(rule.groupByFields || []).map((groupField, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <AutocompleteInput
                      value={groupField}
                      onChange={(value) => updateGroupByField(rule.id, index, value)}
                      fields={fields}
                      placeholder="Type or select field..."
                    />
                  </div>
                  <button
                    onClick={() => removeGroupByField(rule.id, index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!rule.groupByFields || rule.groupByFields.length === 0) && (
                <p className="text-xs text-gray-500 italic">No group by fields added</p>
              )}
            </div>
          </div>
        </>
      );
    }

    // Handle where and cofilter operators
    if (rule.operator === 'where' || rule.operator === 'cofilter') {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Conditions
            </label>
            <button
              onClick={() => addWhereCondition(rule.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Condition
            </button>
          </div>
          <div className="space-y-3">
            {(rule.whereConditions || []).map((condition, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                {index > 0 && (
                  <div className="mb-2">
                    <select
                      value={condition.logicalOperator || 'AND'}
                      onChange={(e) => updateWhereCondition(rule.id, index, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-semibold"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field / Expression
                    </label>
                    <AutocompleteInput
                      value={condition.field}
                      onChange={(value) => updateWhereCondition(rule.id, index, { field: value })}
                      fields={fields}
                      placeholder="Field or expression..."
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Can use expressions like tolower(user) or json_extract(message,"type")
                    </p>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operator
                    </label>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateWhereCondition(rule.id, index, { operator: e.target.value })}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {comparisonOperators.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value / Expression
                    </label>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateWhereCondition(rule.id, index, { value: e.target.value })}
                      placeholder="Value or expression..."
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use quotes for strings: "admin"
                    </p>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {(rule.whereConditions?.length || 0) > 1 && (
                      <button
                        onClick={() => removeWhereCondition(rule.id, index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Handle fields operator with multifield support
    if (rule.operator === 'fields' || rule.operator === 'return' || rule.operator === 'uniq' || rule.operator === 'dedup') {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Field Selections
            </label>
            <button
              onClick={() => addFieldSelection(rule.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Field
            </button>
          </div>
          <div className="space-y-2">
            {(rule.fieldSelections || []).map((selection, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <AutocompleteInput
                    value={selection.field}
                    onChange={(value) => updateFieldSelection(rule.id, index, { field: value })}
                    fields={fields}
                    placeholder="Type or select field..."
                  />
                </div>
                {(rule.operator === 'return' || rule.operator === 'fields') && (
                  <div className="flex-1">
                    <input
                      type="text"
                      value={selection.alias || ''}
                      onChange={(e) => updateFieldSelection(rule.id, index, { alias: e.target.value })}
                      placeholder={rule.operator === 'fields' ? 'as alias (optional)' : 'alias (optional)'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}
                <button
                  onClick={() => removeFieldSelection(rule.id, index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!rule.fieldSelections || rule.fieldSelections.length === 0) && (
              <p className="text-xs text-gray-500 italic">No fields added. Click "Add Field" to start.</p>
            )}
          </div>
        </div>
      );
    }

    // Handle calc operator with expression support
    if (rule.operator === 'calc') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              value={rule.field || ''}
              onChange={(value) => onUpdateRule(rule.id, { field: value })}
              fields={fields}
              placeholder="New or existing field name (e.g., total_bytes, src_ip)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Can create new field or overwrite existing field
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expression <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rule.value || ''}
              onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
              placeholder='e.g., bytes_in + bytes_out, case(status="200","ok","other"), json_extract(message,"src_ip")'
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports: math (+, -, *, /), case(), if(), json_extract(), tolower(), etc.
            </p>
          </div>
        </>
      );
    }

    // Handle lookup operator
    if (rule.operator === 'lookup') {
      const addLookupOutputField = () => {
        const currentFields = rule.lookupOutputFields || [];
        onUpdateRule(rule.id, { lookupOutputFields: [...currentFields, { field: '', alias: '' }] });
      };

      const removeLookupOutputField = (index: number) => {
        const currentFields = rule.lookupOutputFields || [];
        onUpdateRule(rule.id, { lookupOutputFields: currentFields.filter((_, i) => i !== index) });
      };

      const updateLookupOutputField = (index: number, updates: { field?: string; alias?: string }) => {
        const currentFields = rule.lookupOutputFields || [];
        const newFields = [...currentFields];
        newFields[index] = { ...newFields[index], ...updates };
        onUpdateRule(rule.id, { lookupOutputFields: newFields });
      };

      // Initialize join condition if not exists
      const joinCondition = rule.lookupJoinCondition || { lookupField: '', operator: '=' as const, eventField: '' };

      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lookup Table Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rule.lookupTable || ''}
              onChange={(e) => onUpdateRule(rule.id, { lookupTable: e.target.value })}
              placeholder="e.g., geo_table, threat_feed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Join Condition (on) <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Lookup Table Field
                  </label>
                  <input
                    type="text"
                    value={joinCondition.lookupField}
                    onChange={(e) => onUpdateRule(rule.id, {
                      lookupJoinCondition: { ...joinCondition, lookupField: e.target.value }
                    })}
                    placeholder="e.g., lookup_ip, url"
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={joinCondition.operator}
                    onChange={(e) => onUpdateRule(rule.id, {
                      lookupJoinCondition: { ...joinCondition, operator: e.target.value as '=' | 'like' | 'insubnet' }
                    })}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="=">=</option>
                    <option value="like">like</option>
                    <option value="insubnet">insubnet</option>
                  </select>
                </div>
                <div className="col-span-6">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Event Field (from Available Fields)
                  </label>
                  <AutocompleteInput
                    value={joinCondition.eventField}
                    onChange={(value) => onUpdateRule(rule.id, {
                      lookupJoinCondition: { ...joinCondition, eventField: value }
                    })}
                    fields={fields}
                    placeholder="Select field from uploaded data..."
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Example: lookup_ip = src_ip, url like domain, ip insubnet src_ip
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Output Fields <span className="text-red-500">*</span>
              </label>
              <button
                onClick={addLookupOutputField}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Output Field
              </button>
            </div>
            <div className="space-y-2">
              {(rule.lookupOutputFields || []).map((outputField, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={outputField.field}
                      onChange={(e) => updateLookupOutputField(index, { field: e.target.value })}
                      placeholder="Lookup field (e.g., country, reputation)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={outputField.alias || ''}
                      onChange={(e) => updateLookupOutputField(index, { alias: e.target.value })}
                      placeholder="Alias (optional, e.g., geo_country)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeLookupOutputField(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!rule.lookupOutputFields || rule.lookupOutputFields.length === 0) && (
                <p className="text-xs text-gray-500 italic">No output fields added. Click "Add Output Field" to start.</p>
              )}
            </div>
          </div>
        </>
      );
    }

    // Generic parameter rendering for other operators
    return config.parameters.map((param, idx) => {
      if (param.type === 'field') {
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {param.description}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <AutocompleteInput
              value={rule.field || ''}
              onChange={(value) => onUpdateRule(rule.id, { field: value })}
              fields={fields}
              placeholder={`Select ${param.name}...`}
            />
          </div>
        );
      }

      if (param.type === 'select' && param.options) {
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {param.description}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={rule.value || param.options[0]}
              onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {param.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (param.type === 'number') {
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {param.description}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={rule.value || ''}
              onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
              placeholder={param.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
      }

      if (param.type === 'text' || param.type === 'expression') {
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {param.description}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={rule.value || ''}
              onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
              placeholder={param.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {param.type === 'expression' && (
              <p className="text-xs text-gray-500 mt-1">
                Use quotes for strings, field names for references, or expressions with functions
              </p>
            )}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div
      className="space-y-4 min-h-[300px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {rules.map((rule, index) => {
        const config = getOperatorConfig(rule.operator);
        const isFirst = index === 0;
        const isLast = index === rules.length - 1;

        return (
          <div
            key={rule.id}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white relative"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {onReorderRule && rules.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => !isFirst && onReorderRule(rule.id, 'up')}
                      disabled={isFirst}
                      className={`p-1 rounded transition-colors ${
                        isFirst
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => !isLast && onReorderRule(rule.id, 'down')}
                      disabled={isLast}
                      className={`p-1 rounded transition-colors ${
                        isLast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600 text-lg">🎯</span>
                    <h3 className="font-semibold text-gray-900 capitalize">{rule.operator}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{index + 1}</span>
                  </div>
                  {config && (
                    <div className="text-xs text-gray-600 ml-7">
                      <div className="font-mono bg-gray-50 px-2 py-1 rounded">{config.syntax}</div>
                      <div className="mt-1">{config.purpose}</div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveRule(rule.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {renderOperatorFields(rule)}
            </div>
          </div>
        );
      })}

      {rules.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400 bg-gray-50">
          <p className="text-lg mb-2">👆 Drag operators here</p>
          <p className="text-sm">Drag an operator from the left panel to start building your query</p>
        </div>
      )}
    </div>
  );
}
