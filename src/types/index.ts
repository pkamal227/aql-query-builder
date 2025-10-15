export interface Field {
  name: string;
  type: string;
  sampleValue?: string;
}

export interface WhereCondition {
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface FieldSelection {
  field: string;
  alias?: string;
}

export interface LookupOutputField {
  field: string;
  alias?: string;
}

export interface LookupJoinCondition {
  lookupField: string;
  operator: '=' | 'like' | 'insubnet';
  eventField: string;
}

export interface OperatorRule {
  id: string;
  operator: string;
  field?: string;
  customFieldName?: string;
  comparisonOperator?: string;
  value?: string;
  aggregateFunction?: string;
  aggregateField?: string;
  aliasName?: string;
  groupByFields?: string[];
  whereConditions?: WhereCondition[];
  fieldSelections?: FieldSelection[];
  // Lookup operator fields
  lookupTable?: string;
  lookupCondition?: string; // Legacy string format
  lookupJoinCondition?: LookupJoinCondition; // New structured format
  lookupOutputFields?: LookupOutputField[];
  // For drag and drop ordering
  order?: number;
}

export type BuilderMode = 'visual' | 'manual' | 'ai';
