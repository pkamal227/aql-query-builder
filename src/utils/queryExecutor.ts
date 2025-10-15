import { OperatorRule } from '../types';

export function executeAQLQuery(
  query: string,
  logData: Array<Record<string, any>>
): Array<Record<string, any>> {
  if (!logData || logData.length === 0) {
    return [];
  }

  if (!query || query === 'where = ""') {
    return logData;
  }

  // Debug: Show first row's data
  console.log('First row of data:', logData[0]);
  console.log('Total rows:', logData.length);

  const operations = query.split('|').map(op => op.trim());
  let results = [...logData];

  for (const operation of operations) {
    console.log('Executing operation:', operation);
    const beforeCount = results.length;
    results = executeOperation(operation, results);
    console.log(`Results: ${beforeCount} -> ${results.length} rows`);
  }

  return results;
}

function executeOperation(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const op = operation.trim();

  if (op.startsWith('where ')) {
    return executeWhere(op, data);
  }

  if (op.startsWith('aggr ')) {
    return executeAggr(op, data);
  }

  if (op.startsWith('sort ')) {
    return executeSort(op, data);
  }

  if (op.startsWith('limit ')) {
    return executeLimit(op, data);
  }

  if (op.startsWith('head ')) {
    return executeHead(op, data);
  }

  if (op.startsWith('tail ')) {
    return executeTail(op, data);
  }

  if (op.startsWith('fields ')) {
    return executeFields(op, data);
  }

  if (op.startsWith('dedup ')) {
    return executeDedup(op, data);
  }

  if (op.startsWith('top ')) {
    return executeTop(op, data);
  }

  if (op.startsWith('rare ')) {
    return executeRare(op, data);
  }

  if (op.startsWith('calc ') || op.startsWith('eval ')) {
    return executeCalc(op, data);
  }

  return data;
}

function executeWhere(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const whereClause = operation.replace(/^where\s+/, '');
  console.log('Executing where clause:', whereClause);
  console.log('Data count:', data.length);

  // Reset debug flag for this query
  evaluateCondition.hasLogged = false;

  const results = data.filter(row => evaluateWhereClause(whereClause, row));
  console.log('Results count:', results.length);

  if (results.length === 0 && data.length > 0) {
    console.warn('No matches found. Check console logs above for field values.');
  }

  return results;
}

function evaluateWhereClause(clause: string, row: Record<string, any>): boolean {
  const orParts = splitByLogicalOperator(clause, 'OR');

  return orParts.some(orPart => {
    const andParts = splitByLogicalOperator(orPart, 'AND');
    return andParts.every(andPart => evaluateCondition(andPart.trim(), row));
  });
}

function splitByLogicalOperator(clause: string, operator: 'AND' | 'OR'): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < clause.length) {
    const char = clause[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      i++;
      continue;
    }

    if (!inQuotes) {
      const remaining = clause.substring(i);
      const opPattern = new RegExp(`^\\s+${operator}\\s+`, 'i');
      const match = remaining.match(opPattern);

      if (match) {
        parts.push(current.trim());
        current = '';
        i += match[0].length;
        continue;
      }
    }

    current += char;
    i++;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function evaluateCondition(condition: string, row: Record<string, any>): boolean {
  const match = condition.match(/^(.+?)\s*(=|!=|>|<|>=|<=|contains|contains_ci|startswith|endswith)\s*"(.+?)"$/);

  if (!match) {
    console.warn('Failed to parse condition:', condition);
    return false;
  }

  const [, field, operator, value] = match;
  const fieldName = field.trim();

  // Check if field exists
  if (!(fieldName in row)) {
    console.warn(`Field '${fieldName}' not found in row. Available fields:`, Object.keys(row));
    console.warn(`Fields containing 'tenant':`, Object.keys(row).filter(k => k.toLowerCase().includes('tenant')));
    console.warn(`Sample data:`, row);
    return false;
  }

  const fieldValue = String(row[fieldName] ?? '');
  const searchValue = value;

  // Debug logging for specific conditions
  const isFirstCheck = !evaluateCondition.hasLogged;
  if (isFirstCheck) {
    console.log(`Checking condition: "${fieldName}" ${operator} "${searchValue}"`);
    console.log(`Field value in first row: "${fieldValue}"`);
    console.log(`Field value (lowercase): "${fieldValue.toLowerCase()}"`);
    console.log(`Search value (lowercase): "${searchValue.toLowerCase()}"`);
    evaluateCondition.hasLogged = true;
  }

  switch (operator) {
    case '=':
      return fieldValue.toLowerCase() === searchValue.toLowerCase();
    case '!=':
      return fieldValue.toLowerCase() !== searchValue.toLowerCase();
    case 'contains':
    case 'contains_ci':
      return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
    case 'startswith':
      return fieldValue.toLowerCase().startsWith(searchValue.toLowerCase());
    case 'endswith':
      return fieldValue.toLowerCase().endsWith(searchValue.toLowerCase());
    case '>':
      return parseFloat(fieldValue) > parseFloat(searchValue);
    case '<':
      return parseFloat(fieldValue) < parseFloat(searchValue);
    case '>=':
      return parseFloat(fieldValue) >= parseFloat(searchValue);
    case '<=':
      return parseFloat(fieldValue) <= parseFloat(searchValue);
    default:
      return false;
  }
}

function executeAggr(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const byMatch = operation.match(/by\s+(.+?)$/);
  const groupByFields = byMatch ? byMatch[1].split(',').map(f => f.trim()) : [];

  const funcMatch = operation.match(/aggr\s+(count|sum|avg|min|max)\(([^)]*)\)(?:\s+as\s+(\w+))?/);

  if (!funcMatch) {
    return data;
  }

  const [, func, field, alias] = funcMatch;
  const resultField = alias || func;

  if (groupByFields.length === 0) {
    const result: Record<string, any> = {};

    if (func === 'count') {
      result[resultField] = data.length;
    } else if (field) {
      const values = data.map(row => parseFloat(row[field])).filter(v => !isNaN(v));

      switch (func) {
        case 'sum':
          result[resultField] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[resultField] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'min':
          result[resultField] = Math.min(...values);
          break;
        case 'max':
          result[resultField] = Math.max(...values);
          break;
      }
    }

    return [result];
  }

  const groups = new Map<string, Array<Record<string, any>>>();

  data.forEach(row => {
    const key = groupByFields.map(f => row[f]).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const results: Array<Record<string, any>> = [];

  groups.forEach((groupData, key) => {
    const result: Record<string, any> = {};

    groupByFields.forEach((field, idx) => {
      result[field] = key.split('|')[idx];
    });

    if (func === 'count') {
      result[resultField] = groupData.length;
    } else if (field) {
      const values = groupData.map(row => parseFloat(row[field])).filter(v => !isNaN(v));

      switch (func) {
        case 'sum':
          result[resultField] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[resultField] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'min':
          result[resultField] = Math.min(...values);
          break;
        case 'max':
          result[resultField] = Math.max(...values);
          break;
      }
    }

    results.push(result);
  });

  return results;
}

function executeSort(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/sort\s+(\w+)\s+(asc|desc)?/);

  if (!match) {
    return data;
  }

  const [, field, order = 'asc'] = match;

  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return order === 'desc' ? -comparison : comparison;
  });
}

function executeLimit(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/limit\s+(\d+)/);

  if (!match) {
    return data;
  }

  const limit = parseInt(match[1]);
  return data.slice(0, limit);
}

function executeHead(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/head\s+(\d+)/);

  if (!match) {
    return data;
  }

  const limit = parseInt(match[1]);
  return data.slice(0, limit);
}

function executeTail(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/tail\s+(\d+)/);

  if (!match) {
    return data;
  }

  const limit = parseInt(match[1]);
  return data.slice(-limit);
}

function executeFields(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/fields\s+(.+)/);

  if (!match) {
    return data;
  }

  const fields = match[1].split(',').map(f => f.trim());

  return data.map(row => {
    const newRow: Record<string, any> = {};
    fields.forEach(field => {
      if (row.hasOwnProperty(field)) {
        newRow[field] = row[field];
      }
    });
    return newRow;
  });
}

function executeDedup(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/dedup\s+(\w+)/);

  if (!match) {
    return data;
  }

  const field = match[1];
  const seen = new Set<string>();
  const results: Array<Record<string, any>> = [];

  data.forEach(row => {
    const value = String(row[field]);
    if (!seen.has(value)) {
      seen.add(value);
      results.push(row);
    }
  });

  return results;
}

function executeTop(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/top\s+(\d+)?\s*(\w+)/);

  if (!match) {
    return data;
  }

  const [, limitStr, field] = match;
  const limit = limitStr ? parseInt(limitStr) : 10;

  const counts = new Map<string, number>();

  data.forEach(row => {
    const value = String(row[field]);
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return sorted.map(([value, count]) => ({
    [field]: value,
    count: count
  }));
}

function executeRare(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/rare\s+(\d+)?\s*(\w+)/);

  if (!match) {
    return data;
  }

  const [, limitStr, field] = match;
  const limit = limitStr ? parseInt(limitStr) : 10;

  const counts = new Map<string, number>();

  data.forEach(row => {
    const value = String(row[field]);
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  const sorted = Array.from(counts.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit);

  return sorted.map(([value, count]) => ({
    [field]: value,
    count: count
  }));
}

function executeCalc(
  operation: string,
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const match = operation.match(/(calc|eval)\s+(\w+)\s*=\s*(.+)/);

  if (!match) {
    return data;
  }

  const [, , newField, expression] = match;

  return data.map(row => {
    const newRow = { ...row };

    try {
      let expr = expression;
      Object.keys(row).forEach(field => {
        const regex = new RegExp(`\\b${field}\\b`, 'g');
        expr = expr.replace(regex, String(row[field]));
      });

      const result = eval(expr);
      newRow[newField] = result;
    } catch (e) {
      newRow[newField] = null;
    }

    return newRow;
  });
}
