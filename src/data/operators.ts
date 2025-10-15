export const operatorCategories = {
  comparison_filtering: [
    "where", "cofilter"
  ],
  aggregation: [
    "aggr", "timetrend", "eventstats", "top", "rare"
  ],
  string_manipulation: [
    "calc", "rex", "spath", "replace"
  ],
  data_transformation: [
    "fields", "setfields", "fieldsummary", "fillnull", "filldown",
    "makemv", "mvcombine", "mvexpand", "nomv"
  ],
  field_operations: [
    "return"
  ],
  sorting_limiting: [
    "sort", "head", "tail", "limit", "uniq", "dedup", "reverse"
  ],
  enrichment_threat_intel: [
    "lookup", "iplocation", "whois"
  ],
  misc_utility: [
    "addinfo", "reltime", "yieldtable"
  ]
};

export const categoryLabels: Record<string, string> = {
  comparison_filtering: "Comparison & Filtering",
  aggregation: "Aggregation",
  string_manipulation: "String Manipulation",
  data_transformation: "Data Transformation",
  field_operations: "Field Operations",
  sorting_limiting: "Sorting & Limiting",
  enrichment_threat_intel: "Enrichment & Threat Intel",
  misc_utility: "Misc & Utility"
};

export interface OperatorParameter {
  name: string;
  type: 'field' | 'text' | 'number' | 'select' | 'multiField' | 'expression';
  required: boolean;
  options?: string[];
  description: string;
}

export interface OperatorDefinition {
  id: string;
  syntax: string;
  purpose: string;
  parameters: OperatorParameter[];
  examples: string[];
  useCase: string;
}

export const comparisonOperators = [
  '==', '=', '!=', '>', '>=', '<', '<=',
  'contains', 'contains_ci', 'not contains',
  'startswith', 'not startswith', 'endswith',
  'in', 'not in', 'like', 'match', 'insubnet',
  'is null', 'is not null'
];

export const aggregateFunctions = [
  'count', 'sum', 'avg', 'min', 'max', 'median', 'stdev'
];

export const timetrend_eventstats_functions = [
  'count', 'sum', 'avg'
];

export const operators: Record<string, OperatorDefinition> = {
  // Comparison & Filtering
  where: {
    id: 'where',
    syntax: '|where <field or expression> <operator> <value or expression>',
    purpose: 'Filter events based on conditions',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field or expression to evaluate' },
      { name: 'operator', type: 'select', required: true, options: comparisonOperators, description: 'Comparison operator' },
      { name: 'value', type: 'expression', required: true, description: 'Value or expression to compare' }
    ],
    examples: [
      '|where src_ip in ("10.0.0.1","10.0.0.2")',
      '|where tolower(user)="admin"',
      '|where json_extract(message,"event.type")="login"'
    ],
    useCase: 'Filter data based on field values, expressions, or functions'
  },

  cofilter: {
    id: 'cofilter',
    syntax: '|cofilter <field or expression> <operator> <value or expression>',
    purpose: 'Co-occurrence filtering (same as where, applied later in pipeline)',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field or expression to evaluate' },
      { name: 'operator', type: 'select', required: true, options: comparisonOperators, description: 'Comparison operator' },
      { name: 'value', type: 'expression', required: true, description: 'Value or expression to compare' }
    ],
    examples: [
      '|cofilter user="admin"',
      '|cofilter bytes_out > 1000'
    ],
    useCase: 'Apply filtering after aggregations or transformations'
  },

  // Aggregation Operators
  aggr: {
    id: 'aggr',
    syntax: '|aggr <function>(<field>) as <alias> [by <field>]',
    purpose: 'Aggregate data with grouping',
    parameters: [
      { name: 'function', type: 'select', required: true, options: aggregateFunctions, description: 'Aggregation function' },
      { name: 'field', type: 'field', required: false, description: 'Field to aggregate (not needed for count)' },
      { name: 'alias', type: 'text', required: true, description: 'Alias for result' },
      { name: 'groupByFields', type: 'multiField', required: false, description: 'Fields to group by' }
    ],
    examples: [
      '|aggr count(user) as total by src_ip',
      '|aggr sum(bytes_out) as total_bytes by user',
      '|aggr avg(response_time) as avg_time by host'
    ],
    useCase: 'Group and aggregate data for analysis'
  },

  timetrend: {
    id: 'timetrend',
    syntax: '|timetrend <function>(<field>) [by <field>] span=<time>',
    purpose: 'Analyze trends over time',
    parameters: [
      { name: 'function', type: 'select', required: true, options: timetrend_eventstats_functions, description: 'Aggregation function' },
      { name: 'field', type: 'field', required: false, description: 'Field to aggregate' },
      { name: 'groupByFields', type: 'multiField', required: false, description: 'Fields to group by' },
      { name: 'span', type: 'text', required: true, description: 'Time span (e.g., 1h, 5m)' }
    ],
    examples: [
      '|timetrend avg(bytes_in) by user span=1h',
      '|timetrend count() span=5m'
    ],
    useCase: 'Time-series analysis and trending'
  },

  eventstats: {
    id: 'eventstats',
    syntax: '|eventstats <function>(<field>) as <alias> [by <field>]',
    purpose: 'Add aggregate statistics to each event without grouping',
    parameters: [
      { name: 'function', type: 'select', required: true, options: ['count', 'sum', 'avg', 'min', 'max'], description: 'Aggregation function' },
      { name: 'field', type: 'field', required: false, description: 'Field to aggregate' },
      { name: 'alias', type: 'text', required: true, description: 'Alias for result' },
      { name: 'groupByFields', type: 'multiField', required: false, description: 'Fields to group by' }
    ],
    examples: [
      '|eventstats sum(bytes_out) as total_out by src_ip',
      '|eventstats count() as event_count by user'
    ],
    useCase: 'Enrich events with aggregate statistics'
  },

  top: {
    id: 'top',
    syntax: '|top [<n>] <field> [by <field>]',
    purpose: 'Show most common values',
    parameters: [
      { name: 'count', type: 'number', required: false, description: 'Number of top values (default 10)' },
      { name: 'field', type: 'field', required: true, description: 'Field to analyze' },
      { name: 'groupByFields', type: 'multiField', required: false, description: 'Fields to group by' }
    ],
    examples: [
      '|top 5 src_ip by user',
      '|top 10 user_agent'
    ],
    useCase: 'Find most common values for a field'
  },

  rare: {
    id: 'rare',
    syntax: '|rare [<n>] <field> [by <field>]',
    purpose: 'Show least common values',
    parameters: [
      { name: 'count', type: 'number', required: false, description: 'Number of rare values (default 10)' },
      { name: 'field', type: 'field', required: true, description: 'Field to analyze' },
      { name: 'groupByFields', type: 'multiField', required: false, description: 'Fields to group by' }
    ],
    examples: [
      '|rare src_ip by user',
      '|rare 5 error_code'
    ],
    useCase: 'Find least common values for a field'
  },

  // String Manipulation Operators
  calc: {
    id: 'calc',
    syntax: '|calc <field> = <expression>',
    purpose: 'Create or modify fields with freeform expressions',
    parameters: [
      { name: 'field', type: 'text', required: true, description: 'New or existing field name' },
      { name: 'expression', type: 'expression', required: true, description: 'Expression using case, if, json_extract, math, etc.' }
    ],
    examples: [
      '|calc total_bytes = bytes_in + bytes_out',
      '|calc status_label = case(status="200","ok", status="404","not_found","other")',
      '|calc ip = json_extract(message,"src_ip")'
    ],
    useCase: 'Create calculated fields with expressions, functions, and logic'
  },

  rex: {
    id: 'rex',
    syntax: '|rex field=<field> "<regex>"',
    purpose: 'Extract data from a string field using regex',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Input field' },
      { name: 'pattern', type: 'text', required: true, description: 'Regex pattern with named groups' }
    ],
    examples: [
      '|rex field=url "https://(?<domain>[^/]+)/"',
      '|rex field=message "user=(?<username>\\w+)"'
    ],
    useCase: 'Extract structured data from unstructured text'
  },

  spath: {
    id: 'spath',
    syntax: '|spath input=<field> output=<field> path="<json path>"',
    purpose: 'Extract fields from JSON structures',
    parameters: [
      { name: 'input', type: 'field', required: true, description: 'Source JSON field' },
      { name: 'output', type: 'text', required: true, description: 'Output field name' },
      { name: 'path', type: 'text', required: true, description: 'JSONPath selector' }
    ],
    examples: [
      '|spath input=message output=username path="$.actor.user"',
      '|spath input=data output=event_type path="$.event.type"'
    ],
    useCase: 'Parse nested JSON logs'
  },

  replace: {
    id: 'replace',
    syntax: '|replace "<old>" WITH "<new>" IN <field>',
    purpose: 'Replace text in a field',
    parameters: [
      { name: 'oldValue', type: 'text', required: true, description: 'Text to find' },
      { name: 'newValue', type: 'text', required: true, description: 'Replacement text' },
      { name: 'field', type: 'field', required: true, description: 'Target field' }
    ],
    examples: [
      '|replace "http://" WITH "https://" IN url',
      '|replace "error" WITH "ERROR" IN message'
    ],
    useCase: 'Normalize field values'
  },

  // Data Transformation Operators
  fields: {
    id: 'fields',
    syntax: '|fields <field1> [as <alias1>], <field2> [as <alias2>], ...',
    purpose: 'Limit output to specific fields with optional renaming',
    parameters: [
      { name: 'fields', type: 'multiField', required: true, description: 'Fields with optional aliases' }
    ],
    examples: [
      '|fields event_time, src_ip, dest_ip',
      '|fields event_time as ts, src_ip, dest_ip as destination',
      '|fields user, action as event_action, status'
    ],
    useCase: 'Select and optionally rename fields for output'
  },

  setfields: {
    id: 'setfields',
    syntax: '|setfields <alias>=<field>',
    purpose: 'Rename or alias fields',
    parameters: [
      { name: 'mappings', type: 'expression', required: true, description: 'Field mappings (alias=field)' }
    ],
    examples: [
      '|setfields client_ip=src_ip',
      '|setfields source=src_ip, destination=dest_ip'
    ],
    useCase: 'Rename fields for clarity'
  },

  fieldsummary: {
    id: 'fieldsummary',
    syntax: '|fieldsummary <field>',
    purpose: 'Summarize values in a field',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field to summarize' }
    ],
    examples: [
      '|fieldsummary src_ip',
      '|fieldsummary user_agent'
    ],
    useCase: 'Get statistics about field values'
  },

  fillnull: {
    id: 'fillnull',
    syntax: '|fillnull value=<val> <field>',
    purpose: 'Replace null values with a default',
    parameters: [
      { name: 'value', type: 'text', required: true, description: 'Default value for nulls' },
      { name: 'field', type: 'field', required: true, description: 'Field to fill' }
    ],
    examples: [
      '|fillnull value="unknown" user_agent',
      '|fillnull value="0" bytes_out'
    ],
    useCase: 'Handle missing data'
  },

  filldown: {
    id: 'filldown',
    syntax: '|filldown <field>',
    purpose: 'Forward-fill nulls with previous row value',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field to fill down' }
    ],
    examples: [
      '|filldown session_id',
      '|filldown user'
    ],
    useCase: 'Fill missing values with last known value'
  },

  makemv: {
    id: 'makemv',
    syntax: '|makemv delim="<char>" <field>',
    purpose: 'Split a string into a multivalue field',
    parameters: [
      { name: 'delim', type: 'text', required: true, description: 'Delimiter character' },
      { name: 'field', type: 'field', required: true, description: 'Field to split' }
    ],
    examples: [
      '|makemv delim="," email_addresses',
      '|makemv delim=";" tags'
    ],
    useCase: 'Split comma/semicolon-separated values'
  },

  mvcombine: {
    id: 'mvcombine',
    syntax: '|mvcombine <field>',
    purpose: 'Combine multiple rows into a single multivalue field',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field to combine' }
    ],
    examples: [
      '|mvcombine domains',
      '|mvcombine ip_addresses'
    ],
    useCase: 'Group multiple values together'
  },

  mvexpand: {
    id: 'mvexpand',
    syntax: '|mvexpand <field>',
    purpose: 'Expand multivalue fields into separate rows',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Multivalue field to expand' }
    ],
    examples: [
      '|mvexpand email_addresses',
      '|mvexpand tags'
    ],
    useCase: 'Create separate rows for each value'
  },

  nomv: {
    id: 'nomv',
    syntax: '|nomv <field>',
    purpose: 'Collapse multivalue field into one',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field to collapse' }
    ],
    examples: [
      '|nomv src_ip',
      '|nomv domains'
    ],
    useCase: 'Reduce multivalue to single value'
  },

  // Field Operations
  return: {
    id: 'return',
    syntax: '|return [<field>] [<alias>=<field>] [$<field>]',
    purpose: 'Return fields or aliases from subquery',
    parameters: [
      { name: 'fields', type: 'multiField', required: true, description: 'Fields to return with optional aliases' }
    ],
    examples: [
      '|return user, $src_ip, hostname=dest',
      '|return event_time, action'
    ],
    useCase: 'Return specific fields from subqueries'
  },

  // Sorting & Limiting
  sort: {
    id: 'sort',
    syntax: '|sort <field> [asc|desc]',
    purpose: 'Sort results by field',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Field to sort by' },
      { name: 'order', type: 'select', required: false, options: ['asc', 'desc'], description: 'Sort direction (default: asc)' }
    ],
    examples: [
      '|sort bytes_out desc',
      '|sort event_time asc'
    ],
    useCase: 'Order results'
  },

  limit: {
    id: 'limit',
    syntax: '|limit <number>',
    purpose: 'Limit result count',
    parameters: [
      { name: 'count', type: 'number', required: true, description: 'Maximum number of results' }
    ],
    examples: [
      '|limit 100',
      '|limit 1000'
    ],
    useCase: 'Restrict output size'
  },

  head: {
    id: 'head',
    syntax: '|head [<number>]',
    purpose: 'Return first N rows',
    parameters: [
      { name: 'count', type: 'number', required: false, description: 'Number of rows (default 10)' }
    ],
    examples: [
      '|head 10',
      '|head 50'
    ],
    useCase: 'Get top results'
  },

  tail: {
    id: 'tail',
    syntax: '|tail [<number>]',
    purpose: 'Return last N rows',
    parameters: [
      { name: 'count', type: 'number', required: false, description: 'Number of rows (default 10)' }
    ],
    examples: [
      '|tail 5',
      '|tail 20'
    ],
    useCase: 'Get bottom results'
  },

  uniq: {
    id: 'uniq',
    syntax: '|uniq <field>, <field>',
    purpose: 'Return unique rows',
    parameters: [
      { name: 'fields', type: 'multiField', required: true, description: 'Fields to check uniqueness' }
    ],
    examples: [
      '|uniq src_ip, user',
      '|uniq session_id'
    ],
    useCase: 'Remove duplicates'
  },

  dedup: {
    id: 'dedup',
    syntax: '|dedup <field>, <field>',
    purpose: 'Remove duplicate rows based on fields',
    parameters: [
      { name: 'fields', type: 'multiField', required: true, description: 'Fields to deduplicate on' }
    ],
    examples: [
      '|dedup user, src_ip',
      '|dedup session_id'
    ],
    useCase: 'Remove duplicate events'
  },

  reverse: {
    id: 'reverse',
    syntax: '|reverse',
    purpose: 'Reverse current order',
    parameters: [],
    examples: [
      '|reverse'
    ],
    useCase: 'Flip result order'
  },

  // Enrichment & Threat Intel
  lookup: {
    id: 'lookup',
    syntax: '|lookup <table> on <event_field>=<lookup_field> output <fields>',
    purpose: 'Enrich logs by joining with lookup tables',
    parameters: [
      { name: 'table', type: 'text', required: true, description: 'Lookup table name' },
      { name: 'condition', type: 'expression', required: true, description: 'Join condition (e.g., src_ip=ip)' },
      { name: 'fields', type: 'multiField', required: true, description: 'Output fields from lookup' }
    ],
    examples: [
      '|lookup threat_feed on src_ip=ip output reputation, category',
      '|lookup users on user=username output department, role'
    ],
    useCase: 'Enrich with external data'
  },

  iplocation: {
    id: 'iplocation',
    syntax: '|iplocation [prefix=<id>] <field>',
    purpose: 'Geo-enrich IP addresses',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'IP address field' },
      { name: 'prefix', type: 'text', required: false, description: 'Prefix for output fields' }
    ],
    examples: [
      '|iplocation prefix=geo_ src_ip',
      '|iplocation dest_ip'
    ],
    useCase: 'Add geolocation data'
  },

  whois: {
    id: 'whois',
    syntax: '|whois <field>',
    purpose: 'Whois enrichment for domains',
    parameters: [
      { name: 'field', type: 'field', required: true, description: 'Domain field' }
    ],
    examples: [
      '|whois domain',
      '|whois hostname'
    ],
    useCase: 'Get domain registration info'
  },

  // Misc & Utility
  addinfo: {
    id: 'addinfo',
    syntax: '|addinfo',
    purpose: 'Add search metadata',
    parameters: [],
    examples: [
      '|addinfo'
    ],
    useCase: 'Include search metadata in results'
  },

  reltime: {
    id: 'reltime',
    syntax: '|where earliest=-<period>',
    purpose: 'Relative time filtering',
    parameters: [
      { name: 'earliest', type: 'text', required: false, description: 'Earliest time (e.g., -24h)' },
      { name: 'latest', type: 'text', required: false, description: 'Latest time (e.g., now)' }
    ],
    examples: [
      '|where earliest=-24h',
      '|where earliest=-1h latest=now'
    ],
    useCase: 'Time-based filtering'
  },

  yieldtable: {
    id: 'yieldtable',
    syntax: '|yieldtable <table> [append=true]',
    purpose: 'Write results into a lookup table',
    parameters: [
      { name: 'table', type: 'text', required: true, description: 'Table name' },
      { name: 'append', type: 'select', required: false, options: ['true', 'false'], description: 'Append to existing' }
    ],
    examples: [
      '|yieldtable suspicious_users append=true',
      '|yieldtable blocked_ips'
    ],
    useCase: 'Save results to lookup table'
  }
};

export const operatorGuide: Record<string, string> = {
  // Comparison & Filtering
  where: "Filter events based on conditions with expressions",
  cofilter: "Co-occurrence filtering (applied later in pipeline)",

  // Aggregation
  aggr: "Aggregate data with grouping",
  timetrend: "Analyze trends over time",
  eventstats: "Add aggregate statistics to events",
  top: "Show most common values",
  rare: "Show least common values",

  // String Manipulation
  calc: "Create calculated fields with expressions",
  rex: "Extract data using regex",
  spath: "Extract fields from JSON",
  replace: "Replace string values",

  // Data Transformation
  fields: "Select specific fields to return",
  setfields: "Rename fields or create aliases",
  fieldsummary: "Show summary statistics",
  fillnull: "Replace null values",
  filldown: "Forward-fill nulls",
  makemv: "Split string into multivalue",
  mvcombine: "Combine rows into multivalue",
  mvexpand: "Expand multivalue into rows",
  nomv: "Collapse multivalue",

  // Field Operations
  return: "Return fields from subqueries",

  // Sorting & Limiting
  sort: "Sort results by field",
  limit: "Limit number of results",
  head: "Return first N results",
  tail: "Return last N results",
  uniq: "Return unique rows",
  dedup: "Remove duplicate events",
  reverse: "Reverse result order",

  // Enrichment & Threat Intel
  lookup: "Enrich data from lookup tables",
  iplocation: "Add geolocation data for IPs",
  whois: "Get WHOIS domain information",

  // Misc & Utility
  addinfo: "Add search metadata",
  reltime: "Filter with relative time windows",
  yieldtable: "Save results to lookup table"
};

export interface OperatorConfig {
  id: string;
  operator: string;
  params: Record<string, string>;
}
