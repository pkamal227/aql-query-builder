import { OperatorRule, WhereCondition, FieldSelection } from '../types';

export function parseAQLQuery(query: string): OperatorRule[] {
  if (!query || query.trim() === '') return [];

  const lines = query.split('|').map(line => line.trim()).filter(Boolean);
  const rules: OperatorRule[] = [];

  lines.forEach((line, index) => {
    const rule = parseLine(line, index);
    if (rule) {
      rules.push(rule);
    }
  });

  return rules;
}

function parseLine(line: string, index: number): OperatorRule | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length === 0) return null;

  const operator = parts[0];
  const rest = line.substring(operator.length).trim();

  const rule: OperatorRule = {
    id: `rule-${Date.now()}-${index}`,
    operator,
  };

  switch (operator) {
    case 'where':
    case 'cofilter':
      rule.whereConditions = parseWhereConditions(rest);
      break;

    case 'aggr':
      parseAggregate(rest, rule);
      break;

    case 'calc':
    case 'eval':
      rule.value = rest;
      break;

    case 'fields':
      rule.fieldSelections = parseFieldSelections(rest);
      rule.value = rest;
      break;

    case 'sort':
      rule.value = rest;
      break;

    case 'limit':
    case 'head':
    case 'tail':
      rule.value = rest;
      break;

    case 'top':
    case 'rare':
      const match = rest.match(/^(\d+)\s+(.+)$/);
      if (match) {
        rule.value = match[1];
        rule.field = match[2];
      } else {
        rule.value = rest;
      }
      break;

    case 'dedup':
      rule.field = rest;
      break;

    default:
      rule.value = rest;
      break;
  }

  return rule;
}

function parseWhereConditions(expression: string): WhereCondition[] {
  const conditions: WhereCondition[] = [];

  const andParts = expression.split(/\s+AND\s+/i);

  andParts.forEach((part, index) => {
    const orParts = part.split(/\s+OR\s+/i);

    orParts.forEach((subPart, subIndex) => {
      const condition = parseCondition(subPart.trim());
      if (condition) {
        if (subIndex > 0) {
          condition.logicalOperator = 'OR';
        } else if (index > 0) {
          condition.logicalOperator = 'AND';
        }
        conditions.push(condition);
      }
    });
  });

  return conditions;
}

function parseCondition(expr: string): WhereCondition | null {
  const operators = ['contains_ci', 'contains', 'startswith', 'endswith', 'like', 'match', '!=', '<=', '>=', '<', '>', '=', 'in', 'not in', 'isnull', 'isnotnull'];

  for (const op of operators) {
    const regex = new RegExp(`^([\\w"']+)\\s+${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.+)$`, 'i');
    const match = expr.match(regex);

    if (match) {
      let field = match[1].trim();
      let value = match[2].trim();

      field = field.replace(/^["']|["']$/g, '');
      value = value.replace(/^["']|["']$/g, '');

      return {
        field,
        operator: op,
        value,
      };
    }
  }

  const nullCheckMatch = expr.match(/^([\w"']+)\s+(isnull|isnotnull)$/i);
  if (nullCheckMatch) {
    let field = nullCheckMatch[1].trim().replace(/^["']|["']$/g, '');
    return {
      field,
      operator: nullCheckMatch[2],
      value: '',
    };
  }

  return null;
}

function parseAggregate(expr: string, rule: OperatorRule): void {
  const byMatch = expr.match(/^(.+)\s+by\s+(.+)$/i);

  if (byMatch) {
    const aggPart = byMatch[1].trim();
    const groupByPart = byMatch[2].trim();

    rule.groupByFields = groupByPart.split(',').map(f => f.trim());

    parseAggFunction(aggPart, rule);
  } else {
    parseAggFunction(expr, rule);
  }
}

function parseAggFunction(expr: string, rule: OperatorRule): void {
  const asMatch = expr.match(/^(.+)\s+as\s+(\w+)$/i);

  if (asMatch) {
    const funcPart = asMatch[1].trim();
    rule.aliasName = asMatch[2].trim();

    parseFunctionCall(funcPart, rule);
  } else {
    parseFunctionCall(expr, rule);
  }
}

function parseFunctionCall(expr: string, rule: OperatorRule): void {
  const funcMatch = expr.match(/^(\w+)\(([^)]*)\)$/);

  if (funcMatch) {
    const funcName = funcMatch[1].trim();
    rule.aggregateFunction = `${funcName}()`;
    const arg = funcMatch[2].trim();
    if (arg) {
      rule.aggregateField = arg;
    }
  } else {
    console.warn('Could not parse function call:', expr);
  }
}

function parseFieldSelections(expr: string): FieldSelection[] {
  const selections: FieldSelection[] = [];
  const parts = expr.split(',').map(p => p.trim());

  parts.forEach(part => {
    const asMatch = part.match(/^(.+?)\s+as\s+(.+)$/i);
    if (asMatch) {
      selections.push({
        field: asMatch[1].trim(),
        alias: asMatch[2].trim()
      });
    } else {
      selections.push({
        field: part.trim(),
        alias: ''
      });
    }
  });

  return selections;
}
