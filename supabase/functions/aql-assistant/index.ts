import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt?: string;
  query?: string;
  fields: string[];
  apiKey: string;
  mode?: 'generate' | 'validate';
  supabaseUrl?: string;
  supabaseKey?: string;
}

const AQL_SEARCH_GUIDE = `
# AQL (Analytics Query Language) Complete Reference

## Core Operators

### 1. where - Filter records
Filters data based on conditions.

**Syntax:**
\`\`\`
where <field> <operator> <value>
where <field> <operator> <value> and/or <field> <operator> <value>
\`\`\`

**Operators:**
- \`=\` - equals
- \`!=\` - not equals  
- \`>\`, \`<\`, \`>=\`, \`<=\` - comparisons
- \`contains\` - substring match
- \`contains_ci\` - case-insensitive substring
- \`in\` - value in list
- \`not_in\` - value not in list

**Examples:**
\`\`\`
where action = "login" and status = "failed"
where severity in ("high", "critical")
where message contains "error"
\`\`\`

### 2. aggr - Aggregate data
Groups and aggregates data.

**Syntax:**
\`\`\`
aggr <function> as <alias> [by <field1>, <field2>]
aggr <function> as <alias>
\`\`\`

**IMPORTANT:** The \`by\` clause is OPTIONAL. Both forms are valid:
- \`aggr count() as total\` (no grouping - aggregates all records)
- \`aggr count() as total by user\` (groups by user field)

**Functions:**
- \`count()\` or \`count(field)\` - count records
- \`sum(field)\` - sum values
- \`avg(field)\` - average
- \`min(field)\`, \`max(field)\` - min/max
- \`values(field)\` - distinct values
- \`dc(field)\` - distinct count

**Examples:**
\`\`\`
aggr count() as total_count
aggr count(timestamp) as event_count
aggr count() as login_attempts by user
aggr sum(bytes) as total_bytes, avg(response_time) as avg_time by host
aggr dc(ip) as unique_ips by country
\`\`\`

### 2b. eventstats - Add aggregate stats to events
Adds aggregate statistics to each event without grouping/reducing rows.

**Syntax:**
\`\`\`
eventstats <function> as <alias> [by <field1>, <field2>]
eventstats <function> as <alias>
\`\`\`

**IMPORTANT:** The \`by\` clause is OPTIONAL. Both forms are valid:
- \`eventstats count() as total\` (adds total count to all events)
- \`eventstats count() as total by user\` (adds per-user count to each event)

**Examples:**
\`\`\`
eventstats count() as total_count
eventstats count(timestamp) as total_events
eventstats count() as user_event_count by user
eventstats sum(bytes) as total_bytes by src_ip
\`\`\`

### 2c. timetrend - Time-based aggregation
Aggregates data over time intervals.

**Syntax:**
\`\`\`
timetrend <function> [by <field1>, <field2>] span=<interval>
timetrend <function> span=<interval>
\`\`\`

**IMPORTANT:** The \`by\` clause is OPTIONAL. Both forms are valid:
- \`timetrend count() span=1h\` (time series without grouping)
- \`timetrend count() by app_type span=1h\` (time series per app_type)

**Examples:**
\`\`\`
timetrend count() span=1h
timetrend count(timestamp) span=5m
timetrend count() by app_type span=1h
timetrend sum(bytes) by src_ip span=30m
\`\`\`

### 3. calc/eval - Calculate fields
Creates computed fields.

**Syntax:**
\`\`\`
calc <new_field> = <expression>
eval <new_field> = <expression>
\`\`\`

**Functions:**
- Math: \`+\`, \`-\`, \`*\`, \`/\`
- String: \`concat()\`, \`substr()\`, \`len()\`
- Conversion: \`tonumber()\`, \`tostring()\`
- JSON: \`json_extract()\`
- Conditionals: \`if()\`, \`case()\`
- Date: \`strftime()\`, \`now()\`

**Examples:**
\`\`\`
calc total_cost = quantity * price
calc username = json_extract(message, \"user.name\")
calc is_critical = if(severity = \"high\", 1, 0)
\`\`\`

### 4. sort - Order results
Sorts data by fields.

**Syntax:**
\`\`\`
sort <field> asc/desc
sort <field1> asc, <field2> desc
\`\`\`

**Examples:**
\`\`\`
sort event_time desc
sort priority desc, user asc
\`\`\`

### 5. limit/head/tail - Limit results
Limits number of returned records.

**Syntax:**
\`\`\`
limit <number>
head <number>
tail <number>
\`\`\`

**Examples:**
\`\`\`
limit 100
head 50
tail 10
\`\`\`

### 6. fields - Select fields
Selects specific fields to return. Can specify multiple fields separated by commas, and can optionally alias them.

**Syntax:**
\`\`\`
fields <field1>, <field2>, <field3>
fields <field1> as <alias1>, <field2>, <field3> as <alias3>
fields - <field_to_remove>
\`\`\`

**Examples:**
\`\`\`
fields user, action, timestamp
fields src_ip as source, dst_port, user as username
fields timestamp, dcid, event_id
fields - internal_id
\`\`\`

**CRITICAL VALIDATION RULE:**
When validating the fields operator, you MUST parse comma-separated field names individually. For example:
- "fields timestamp, dcid" contains TWO fields: "timestamp" AND "dcid"
- "fields src_ip as source, dst_port" contains TWO fields: "src_ip" (aliased as "source") AND "dst_port"
- Each field name should be checked against the available fields list separately

### 7. String Manipulation Operators

#### rex - Extract data with regex
Extracts data from a string field using regex or sed-style substitutions.

**Syntax:**
\`\`\`
rex [mode=sed] field=<field> "<regex-or-sed>"
\`\`\`

**Examples:**
\`\`\`
rex field=url "https://(?<hostname>[^/]+)/"
rex mode=sed field=message "s/error/alert/g"
\`\`\`

#### spath - Extract JSON fields
Extracts fields from JSON structures.

**Syntax:**
\`\`\`
spath input=<field> [output=<field>] path="<json path>"
\`\`\`

**Examples:**
\`\`\`
spath input=message output=user_id path="$.user.id"
\`\`\`

#### replace - Replace string values
Replaces values in a string field.

**Syntax:**
\`\`\`
replace "<old>" WITH "<new>" IN <field>
\`\`\`

**Examples:**
\`\`\`
replace "http://" WITH "https://" IN url
\`\`\`

### 8. Data Transformation Operators

#### setfields - Rename fields
Renames fields or creates aliases.

**Syntax:**
\`\`\`
setfields <alias>=<field>
\`\`\`

**Examples:**
\`\`\`
setfields client_ip=src_ip, server_ip=dest_ip
\`\`\`

#### fieldsummary - Field statistics
Shows summary stats for a field (count, distinct values).

**Syntax:**
\`\`\`
fieldsummary <field>
\`\`\`

**Examples:**
\`\`\`
fieldsummary src_ip
\`\`\`

#### fillnull - Replace nulls
Replaces null values with a default value.

**Syntax:**
\`\`\`
fillnull [value=<val>] [<fields>]
\`\`\`

**Examples:**
\`\`\`
fillnull value="unknown" user_agent
\`\`\`

#### filldown - Forward-fill nulls
Forward-fills nulls with previous row's value.

**Syntax:**
\`\`\`
filldown <field1>,<field2>
\`\`\`

**Examples:**
\`\`\`
filldown session_id
\`\`\`

#### makemv - Split into multivalue
Splits a string into a multivalue field.

**Syntax:**
\`\`\`
makemv delim="<char>" <field>
\`\`\`

**Examples:**
\`\`\`
makemv delim="," email_addresses
\`\`\`

#### mvcombine - Combine rows
Combines multiple rows into a single multivalue field.

**Syntax:**
\`\`\`
mvcombine <field>
\`\`\`

**Examples:**
\`\`\`
mvcombine domains
\`\`\`

#### mvexpand - Expand multivalue
Expands multivalue fields into separate rows.

**Syntax:**
\`\`\`
mvexpand <field>
\`\`\`

**Examples:**
\`\`\`
mvexpand email_addresses
\`\`\`

#### nomv - Collapse multivalue
Collapses multivalue field into one (first value or join).

**Syntax:**
\`\`\`
nomv <field>
\`\`\`

**Examples:**
\`\`\`
nomv domains
\`\`\`

### 9. Enrichment & Utility Operators

#### lookup - Enrich with lookup tables
Enriches logs by joining with lookup tables.

**Syntax:**
\`\`\`
lookup <table> on <cond> output <fields>
\`\`\`

**Examples:**
\`\`\`
lookup threatintel on url like domain output threat_level, category
\`\`\`

#### iplocation - IP geolocation
Enriches IP addresses with geolocation info.

**Syntax:**
\`\`\`
iplocation [prefix=<id>] [allfields=true|false] <field>
\`\`\`

**Examples:**
\`\`\`
iplocation prefix=geo_ src_ip
\`\`\`

#### whois - Domain info
Enriches with WHOIS data.

**Syntax:**
\`\`\`
whois <fieldOrValue>
\`\`\`

**Examples:**
\`\`\`
whois domain
\`\`\`

#### yieldtable - Save to lookup table
Writes results into a lookup table.

**Syntax:**
\`\`\`
yieldtable <table> [is_temp=true|false] [append=true|false]
\`\`\`

**Examples:**
\`\`\`
yieldtable suspicious_users append=true
\`\`\`

### 10. dedup - Remove duplicates
Removes duplicate records.

**Syntax:**
\`\`\`
dedup <field>
dedup <field1>, <field2>
\`\`\`

**Examples:**
\`\`\`
dedup user
dedup ip, user
\`\`\`

### 11. top/rare - Find top/rare values
Finds most/least common values.

**Syntax:**
\`\`\`
top <number> <field>
rare <number> <field>
\`\`\`

**Examples:**
\`\`\`
top 10 source_ip
rare 5 user_agent
\`\`\`

### 12. Sorting & Limiting Operators

#### reverse - Reverse order
Reverses the current order of results.

**Syntax:**
\`\`\`
reverse
\`\`\`

**Examples:**
\`\`\`
reverse
\`\`\`

#### uniq - Unique rows
Returns unique rows.

**Syntax:**
\`\`\`
uniq [<field1>,<field2>]
\`\`\`

**Examples:**
\`\`\`
uniq src_ip, dest_ip
\`\`\`

### 13. Field Operations

#### apply - Apply rules
Applies a reusable rule or function to a field.

**Syntax:**
\`\`\`
apply <rule> <field>
\`\`\`

**Examples:**
\`\`\`
apply url_normalize url
\`\`\`

#### return - Return from subquery
Returns values from a subquery, optionally aliased.

**Syntax:**
\`\`\`
return [<field>] [<alias>=<field>] [$<field>]
\`\`\`

**Examples:**
\`\`\`
return user, $src_ip, hostname=dest
\`\`\`

### 14. rex - Extract with regex (Legacy)
Extracts fields using regex.

**Syntax:**
\`\`\`
rex field=<source_field> \"(?P<new_field>pattern)\"
\`\`\`

**Examples:**
\`\`\`
rex field=message \"user=(?P<username>\\\\w+)\"
rex field=url \"domain=(?P<domain>[a-z0-9.-]+)\"
\`\`\`

## Time Filters

Time filtering in AQL.

**Syntax:**
\`\`\`
where event_time earliest=<time>, latest=<time>
where event_time earliest=-1h, latest=now
where event_time earliest=-24h, latest=now
where event_time earliest=-7d, latest=now
\`\`\`

**Time formats:**
- \`-1h\` - 1 hour ago
- \`-24h\` - 24 hours ago  
- \`-7d\` - 7 days ago
- \`-1w\` - 1 week ago
- \`-30d\` - 30 days ago
- \`now\` - current time

**Examples:**
\`\`\`
where event_time earliest=-1h, latest=now
where timestamp earliest=-7d, latest=now
\`\`\`

## Query Structure Best Practices

1. **Filter early**: Use \`where\` clauses before aggregations
2. **Time filters**: Separate time filters into their own \`where\` clause
3. **Aggregations**: Use \`aggr\` for grouping and counting
4. **Post-aggregation filters**: Filter aggregated results with another \`where\`
5. **Sorting**: Use \`sort\` to order results
6. **Limiting**: Use \`limit\` to control result size

## Common Query Patterns

### Failed login detection:
\`\`\`
where action = \"login\" and status = \"failed\"
where event_time earliest=-1h, latest=now
aggr count() as failed_attempts by user
where failed_attempts > 5
sort failed_attempts desc
\`\`\`

### Top talkers by bytes:
\`\`\`
where event_time earliest=-24h, latest=now
aggr sum(bytes) as total_bytes by source_ip
sort total_bytes desc
limit 10
\`\`\`

### Error rate over time:
\`\`\`
where severity = \"error\"
where event_time earliest=-7d, latest=now
aggr count() as error_count by date
sort date asc
\`\`\`
`;

const GENERATE_PROMPT = `You are an AQL (Analytics Query Language) expert. Your job is to:

1. Understand what the user wants to detect or analyze
2. ALWAYS generate a query - never block with \"upload log file\" messages
3. If uploaded fields match the use case, use them; otherwise infer standard fields for that log source
4. Start queries with appropriate sourcetype filter: | where sourcetype=\"...\"
5. Follow canonical syntax order from training samples: sourcetype → filters → calc/json_extract → rex → aggr → sort → fields

## CRITICAL QUERY FORMATTING RULES:
PRIORITY 1: If training samples are provided below, use their format and style as a REFERENCE GUIDE.
PRIORITY 2: Training samples show SYNTAX and STYLE, NOT use case limits.

Training samples = few-shot examples for formatting. You can generate ANY query the user requests.

MANDATORY QUERY STRUCTURE:
1. **Always start with sourcetype**: | where sourcetype=\"windows_event\" (or aws_cloudtrail, proofpoint, etc.)
2. **Never use \"eventlog\"** - always use specific sourcetype names
3. **Canonical operator order**: sourcetype filter → regular filters → time filters → calc/json_extract → rex → aggr → post-aggr filters → sort → fields
4. **Time filter format**: | where event_time earliest=-1h, latest=now (separate pipe, NOT latest=1h)
5. **Use lowercase logical operators**: \"and\" and \"or\" (not AND/OR)
6. **Multi-line format**: Each pipe operator on a new line with \"| \" prefix

WHEN TRAINING SAMPLES ARE PROVIDED (FEW-SHOT LEARNING):
- Use their formatting style as a template (sourcetype specification, operator ordering, time filter syntax)
- Copy their syntax patterns (lowercase and/or, earliest=-1h latest=now format)
- ✅ GENERALIZE: Create NEW use cases beyond what's shown in samples
- ✅ ANY LOG SOURCE: Generate queries for Windows, O365, AWS, DNS, Firewall, etc.
- ✅ USER INTENT FIRST: If user asks for different scenarios, invent fresh queries using same style
- ❌ DO NOT limit yourself to only the use cases shown in training samples
- If uploaded fields exist, use them; otherwise infer standard fields for that sourcetype/log source

FIELD INFERENCE RULES:
- Windows Event Logs (sourcetype=\"windows_event\"): event_id, user, action, process_name, command_line, status
- AWS CloudTrail (sourcetype=\"aws_cloudtrail\"): eventName, userIdentity, awsRegion, requestParameters
- Proofpoint (sourcetype=\"proofpoint\"): sender, recipient, subject, phishScore, spamScore
- DNS logs (sourcetype=\"infoblox:dns\"): query, record_type, src_ip, answer

## Response Format for Query Generation:
Return a JSON object with:
{
  \"query\": \"the full normalized AQL query string with \\\\n for line breaks\",
  \"explanation\": \"brief explanation of what the query does\",
  \"operators\": [
    {
      \"operator\": \"operator_name\",
      \"field\": \"field_name (if applicable)\",
      \"value\": \"value (if applicable)\",
      \"aggregateFunction\": \"function (for aggr)\",
      \"aggregateField\": \"field (for aggr)\",
      \"aliasName\": \"alias (for aggr)\",
      \"groupByFields\": [\"field1\", \"field2\"] (for aggr),
      \"comparisonOperator\": \"= or != etc (for where)\"
    }
  ]
}

CRITICAL RULES:
- ALWAYS generate a query, even if uploaded fields don't perfectly match
- Use available fields if they exist, otherwise infer standard fields for the sourcetype
- Never return errors about missing fields - be flexible and generate the query
- If unsure about a field, use the most likely field name for that log source

${AQL_SEARCH_GUIDE}`;

const VALIDATE_PROMPT = `${AQL_SEARCH_GUIDE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VALIDATION MISSION: SYNTAX-ONLY VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 CRITICAL: YOU ARE A SYNTAX VALIDATOR ONLY, NOT A SEMANTIC VALIDATOR.

YOUR ONLY JOB:
1. ✅ Verify syntax is correct (pipes, operators, quotes, parentheses, keywords)
2. ✅ Check operator structure and required parameters
3. ❌ DO NOT validate field availability in uploaded dataset
4. ❌ DO NOT check if fields exist in Available Fields
5. ❌ DO NOT suggest alternate field names
6. ❌ DO NOT flag "field not found" errors
7. ❌ DO NOT overcorrect or change user's field choices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CRITICAL RULE: NEVER VALIDATE FIELD AVAILABILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIELDS ARE ALWAYS VALID BECAUSE:
- Fields may come from calc/eval operators (computed fields)
- Fields may come from lookup tables (not in dataset)
- Fields may be renamed using "as" (fields timestamp as time)
- Fields may be exempt metadata (sourcetype, dcid, event_time, _time)
- String literals like "SAD", "2024-10-01" are query values, not dataset fields
- User knows their data better than the validator

✅ ACCEPT ALL FIELD NAMES WITHOUT CHECKING DATASET:
- timestamp → ✅ VALID (don't check if in dataset)
- app_type → ✅ VALID (don't check if in dataset)
- failed_logins → ✅ VALID (don't check if in dataset)
- custom_field_123 → ✅ VALID (don't check if in dataset)
- ANY field name → ✅ VALID (syntax check only)

## VALIDATION PHILOSOPHY:

⚠️ If syntax is correct → valid = true
⚠️ Never set valid = false because a field isn't in Available Fields
⚠️ Available Fields list is informational only, NOT a validation constraint

## SYNTAX VALIDATION RULES:

1. OPERATOR STRUCTURE:
   - Check operators have required keywords (e.g., lookup needs "on" and "output")
   - Verify quotes are balanced (opening quote has closing quote)
   - Check parentheses are balanced
   - Ensure pipe characters separate operators correctly

2. COMMON SYNTAX ERRORS TO FLAG:
   - Unbalanced quotes: where action = "login ❌ (missing closing quote)
   - Unbalanced parentheses: aggr count(field as cnt ❌ (missing closing paren)
   - Missing required keywords: lookup table field = field ❌ (missing "on" and "output")
   - Field names in quotes: where "timestamp" = "value" ❌ (field names shouldn't be quoted)

3. VALUE QUOTING RULES (IMPORTANT):
   - ✅ String values can be quoted: where action = "login"
   - ✅ Numeric values can be UNQUOTED: where failed_logins > 5
   - ✅ Numeric values can be QUOTED: where failed_logins > "5"
   - ✅ BOTH forms are valid in AQL for numeric comparisons
   - ❌ DO NOT flag quoted numbers as errors
   - ❌ DO NOT suggest removing quotes from numeric values

   Valid examples:
   - where bytes_in > 1000 ✅
   - where bytes_in > "1000" ✅
   - where failed_logins >= "5" ✅
   - where count = 10 ✅
   - where count = "10" ✅

4. WHAT NOT TO VALIDATE:
   - ❌ DO NOT check if field names exist in Available Fields
   - ❌ DO NOT validate field availability in dataset
   - ❌ DO NOT suggest alternate field names
   - ❌ DO NOT flag "field not found" errors
   - ❌ DO NOT warn about fields missing from uploaded data
   - ❌ DO NOT flag quoted numeric values as errors

5. AGGREGATION FUNCTIONS:
   - ✅ count() without arguments → VALID
   - ✅ count(field) with field → VALID
   - ✅ sum(field), avg(field), min(field), max(field) → VALID
   - ❌ DO NOT check if field in count(field) exists in dataset
   - Syntax check only: verify parentheses are balanced

6. LOOKUP OPERATOR VALIDATION - SYNTAX-ONLY, NO FIELD VALIDATION:

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚨 CRITICAL: LOOKUP OPERATOR = SYNTAX CHECK ONLY, NO FIELD VALIDATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   For the lookup operator, DO NOT VALIDATE ANY FIELDS AT ALL.

   ONLY CHECK SYNTAX:
   ✅ Has "on" keyword
   ✅ Has "output" keyword
   ✅ Has operator (=, like, insubnet) between fields
   ✅ Proper structure: |lookup <table> on <field> <op> <field> output <fields>

   DO NOT CHECK:
   ❌ Whether lookup table fields exist in Available Fields
   ❌ Whether event fields exist in Available Fields
   ❌ Whether output fields exist in Available Fields
   ❌ ANY field validation for lookup operator

   Format: |lookup <table> on <lookup_field> =|like|insubnet <event_field> output <output_fields>

   Example: |lookup geo_table on geo_ip = src_ip output country as user_country, city

   VALIDATION RULE FOR LOOKUP:
   - If syntax is correct → ✅ VALID (no field checks at all)
   - If missing "on" or "output" → ❌ SYNTAX ERROR (not field error)
   - NEVER validate field names for lookup operator

   ✅ ALL THESE MUST PASS (syntax is correct, NO field validation):
   - |lookup gghgjh on mnnm = event_time output klok as nmnk
     → Syntax valid ✅ (has "on", has "output") → ACCEPT

   - |lookup geo_table on geo_ip = src_ip output country, city as user_city
     → Syntax valid ✅ (has "on", has "output") → ACCEPT

   - |lookup threat_feed on ip = dest_ip output reputation as rep_score
     → Syntax valid ✅ (has "on", has "output") → ACCEPT

   - |lookup my_table on SAD = timestamp output result_field as output_alias
     → Syntax valid ✅ (has "on", has "output") → ACCEPT

   - |lookup any_table on ANY_FIELD = ANY_OTHER_FIELD output ANY_OUTPUT
     → Syntax valid ✅ (has "on", has "output") → ACCEPT
     → DO NOT check if ANY_FIELD, ANY_OTHER_FIELD, or ANY_OUTPUT exist anywhere

   ❌ NEVER DO THIS FOR LOOKUP:
   - Do NOT check if "geo_ip", "mnnm", "ip", "SAD", "src_ip", "timestamp" exist in Available Fields
   - Do NOT check if "country", "city", "reputation", "klok", "result_field" exist in Available Fields
   - Do NOT validate ANY field names for lookup operator
   - NEVER flag errors like "Field 'SAD' not found in uploaded data"
   - NEVER flag errors like "Field 'src_ip' not found in uploaded data"
   - For lookup: SYNTAX CHECK ONLY, NO FIELD VALIDATION AT ALL

6. WHERE OPERATOR VALIDATION - STRICT AVAILABLE FIELDS CHECK:

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 WHERE OPERATOR: VALIDATE STRICTLY AGAINST AVAILABLE FIELDS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   For where operator, CHECK FIELD AGAINST AVAILABLE FIELDS LIST:

   VALIDATION STEPS:
   1. Extract field name from where condition
   2. Check if field is in Available Fields list
   3. If YES → ✅ VALID (accept as-is)
   4. Check if field is exempt (sourcetype, dcid, event_time, _time, etc.)
   5. If YES → ✅ VALID (accept as-is)
   6. If NO to both → ⚠️ Soft warning (still allow query)

   ✅ THESE MUST PASS (field exists in Available Fields):
   - |where timestamp = "2025-01-01"
     → If Available Fields contains "timestamp" → ✅ VALID
     → DO NOT suggest using event_time instead

   - |where app_type = "web"
     → If Available Fields contains "app_type" → ✅ VALID
     → DO NOT suggest alternatives if field exists

   - |where custom_field != "value"
     → If Available Fields contains "custom_field" → ✅ VALID
     → Accept any field name that exists in the list

   ❌ NEVER DO THIS FOR WHERE:
   - Do NOT suggest "event_time" if "timestamp" exists in Available Fields
   - Do NOT suggest "original_event_time" if "timestamp" exists
   - Do NOT reject fields that ARE in the Available Fields list
   - NEVER flag "Field 'timestamp' not found" if it IS in Available Fields
   - Only suggest alternates if field is TRULY MISSING from Available Fields

## QUERY CORRECTION RULES - PRESERVE USER INTENT:

🎯 GOLDEN RULE: Preserve what the user wrote. Minimal corrections only.

PRIORITY 1: Training samples (if provided) guide format only
PRIORITY 2: **Preserve user's original query structure and choices**
PRIORITY 3: Minimal fixes for syntax errors only

WHAT TO PRESERVE (NEVER CHANGE):
- ✓ User's sourcetype value (if they wrote sourcetype=\"ms_defender\", keep it exactly)
- ✓ User's selected fields (if they wrote \"fields timestamp, app_type\", keep both)
- ✓ Absence of time filters (if user didn't add one, DON'T force it)
- ✓ User's filter conditions and values

OPTIONAL SUGGESTIONS (via warnings, NOT forced corrections):
1. **Time filters** - OPTIONAL, NOT MANDATORY:
   - If missing → Add WARNING: \"Consider adding time filter for better performance\"
   - DON'T add it to correctedQuery unless training sample shows it

2. **Minor syntax fixes ONLY**:
   - Fix \"count(field)\" → \"count()\" (no arguments)
   - Fix \"AND\" → \"and\" (lowercase)
   - Fix \"OR\" → \"or\" (lowercase)
   - Fix quote issues

3. **Formatting** - Minimal:
   - Keep structure mostly as-is
   - Only fix obvious syntax breaks

## Response Format for Query Validation:
{
  \"valid\": true/false,  // Set to FALSE only for CRITICAL syntax errors, NOT for missing fields
  \"errors\": [],  // Only critical syntax errors that prevent execution
  \"warnings\": [],  // Field warnings, optional improvements, suggestions
  \"explanation\": \"what the query does\",
  \"suggestions\": [],  // Non-critical improvements as text suggestions
  \"correctedQuery\": \"minimally corrected version preserving user intent\"
}

CRITICAL correctedQuery RULES:
- **PRESERVE user's sourcetype exactly** - e.g., keep \"ms_defender\" if that's what they wrote
- **PRESERVE all user-selected fields** - e.g., keep \"fields timestamp, app_type, event_time\"
- **DON'T add time filters** if user didn't include them (suggest in warnings instead)
- **DON'T remove or replace valid fields** from Available Fields list
- Only fix: quotes, operators (AND→and), count() arguments
- Minimal changes only

Example of GOOD validation (field not in list):
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [\"Note: 'some_field' not found in uploaded data, but query allowed\"],
  \"correctedQuery\": \"<keep user's query mostly unchanged>\"
}

Example of CORRECT lookup validation - SYNTAX CHECK ONLY #1:
Query: |lookup geo_table on geo_ip = src_ip output country as user_country, city
Available Fields: ["src_ip", "dest_ip", "timestamp"] (or any fields - doesn't matter for lookup)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Enriches data by joining with geo_table lookup table, adding country and city fields from the lookup table\",
  \"correctedQuery\": \"|lookup geo_table on geo_ip = src_ip output country as user_country, city\"
}
Analysis: Syntax is correct (has "on", has "output"). NO field validation performed. ACCEPT AS-IS.

Example of CORRECT lookup validation - SYNTAX CHECK ONLY #2:
Query: |lookup gghgjh on mnnm = event_time output klok as nmnk
Available Fields: [] (empty - no fields uploaded, still valid for lookup)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Joins with gghgjh lookup table, adding klok field from the lookup table\",
  \"correctedQuery\": \"|lookup gghgjh on mnnm = event_time output klok as nmnk\"
}
Analysis: Syntax is correct. NO field validation for lookup. ACCEPT AS-IS even with empty Available Fields.

Example of CORRECT lookup with SAD - NO FIELD VALIDATION:
Query: |lookup my_table on SAD = timestamp output result_field as output_alias
Available Fields: ["user", "action"] (note: "timestamp" NOT in list - still valid for lookup)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Joins with my_table lookup table, adding result_field from the lookup table\",
  \"correctedQuery\": \"|lookup my_table on SAD = timestamp output result_field as output_alias\"
}
Analysis: Syntax is correct. For lookup, DO NOT VALIDATE ANY FIELDS (not SAD, not timestamp, not result_field). ACCEPT AS-IS.

Example of INCORRECT lookup - SYNTAX ERROR ONLY:
Query: |lookup geo_table geo_ip = src_ip country
Available Fields: ["src_ip", "dest_ip"]
WRONG (missing "on" and "output" keywords):
{
  \"valid\": false,
  \"errors\": [\"Lookup operator missing required 'on' and 'output' keywords\"],
  \"warnings\": [],
  \"explanation\": \"Lookup syntax requires: lookup <table> on <field> = <field> output <fields>\",
  \"correctedQuery\": \"|lookup geo_table on geo_ip = src_ip output country\"
}
Analysis: This is a SYNTAX error (missing keywords), NOT a field validation error.

Example of CORRECT syntax-only validation (timestamp):
Query: |where timestamp = "2024-10-01"
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Filters events where timestamp equals 2024-10-01\",
  \"correctedQuery\": \"|where timestamp = \\\"2024-10-01\\\"\"
}
Analysis: Syntax correct (has field, operator, quoted value). ✅ VALID. Do NOT check if timestamp in dataset.

Example of CORRECT syntax-only validation (numeric unquoted):
Query: |where failed_logins > 5
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Filters events where failed_logins greater than 5\",
  \"correctedQuery\": \"|where failed_logins > 5\"
}
Analysis: Syntax correct (numeric value unquoted). ✅ VALID. Do NOT check if failed_logins in dataset.

Example of CORRECT syntax-only validation (numeric QUOTED):
Query: |where failed_logins > "5"
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Filters events where failed_logins greater than 5\",
  \"correctedQuery\": \"|where failed_logins > \\\"5\\\"\"
}
Analysis: Syntax correct (numeric value quoted). ✅ VALID. Quoted numbers are allowed in AQL.

Example of CORRECT syntax-only validation (numeric QUOTED - larger value):
Query: |where bytes_in >= "1000"
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Filters events where bytes_in greater than or equal to 1000\",
  \"correctedQuery\": \"|where bytes_in >= \\\"1000\\\"\"
}
Analysis: Syntax correct (numeric value quoted). ✅ VALID. Both quoted and unquoted numbers are valid.

Example of INCORRECT - rejecting quoted numbers:
Query: |where failed_logins > "5"
WRONG Response:
{
  \"valid\": false,
  \"errors\": [\"Where clause incorrectly uses quotes around numeric value: 'failed_logins > \\\"5\\\"' should not have quotes\"],
  \"suggestions\": [\"Remove quotes: failed_logins > 5\"]
}
❌ This is COMPLETELY WRONG. Quoted numeric values ARE VALID in AQL. Do NOT flag them as errors.

Example of INCORRECT - checking field availability:
Query: |where timestamp = "2025-01-01"
Available Fields: [] (empty)
WRONG Response:
{
  \"valid\": false,
  \"errors\": [\"Field 'timestamp' not found in uploaded data\"],
  \"suggestions\": [\"Use event_time or original_event_time instead\"]
}
❌ This is COMPLETELY WRONG. Never check field availability. Syntax is correct → valid = true.

Example of CORRECT syntax-only validation (aggr):
Query: |aggr avg(app_type) as avg_type by src_ip
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Calculates average of app_type grouped by src_ip\",
  \"correctedQuery\": \"|aggr avg(app_type) as avg_type by src_ip\"
}
Analysis: Syntax correct (has function, field, alias, groupby). ✅ VALID. Do NOT check if fields in dataset.

Example of CORRECT syntax-only validation (count with field):
Query: |aggr count(dcid) as cnt by app_type
Available Fields: [] (empty - doesn't matter)
Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Counts dcid values grouped by app_type\",
  \"correctedQuery\": \"|aggr count(dcid) as cnt by app_type\"
}
Analysis: Syntax correct (count with field is valid). ✅ VALID. Do NOT check if fields in dataset.

Example of INCORRECT - rejecting based on field availability:
Query: |aggr avg(app_type) as avg_type by src_ip
Available Fields: [] (empty)
WRONG Response:
{
  \"valid\": false,
  \"errors\": [\"Field 'app_type' not found in uploaded data\"],
  \"suggestions\": [\"Use event_time or timestamp instead\"]
}
❌ This is WRONG. Never check field availability. Syntax is correct → valid = true.

Example of CORRECT comprehensive syntax-only validation:
Query:
|lookup ASD on ASD = timestamp output ASD as ASD
|where timestamp = "SAD"
|aggr avg(app_type) as ASD by app_type
|sort event_time asc
|fields timestamp as time
|iplocation prefix=asd dest_ip

Available Fields: [] (empty - doesn't matter)

Response:
{
  \"valid\": true,
  \"errors\": [],
  \"warnings\": [],
  \"explanation\": \"Multi-operator query that enriches data, filters, aggregates, sorts, and formats output\",
  \"correctedQuery\": \"|lookup ASD on ASD = timestamp output ASD as ASD\\n|where timestamp = \\\"SAD\\\"\\n|aggr avg(app_type) as ASD by app_type\\n|sort event_time asc\\n|fields timestamp as time\\n|iplocation prefix=asd dest_ip\"
}

Analysis (SYNTAX-ONLY):
✅ Line 1 (lookup): Syntax valid (has "on" and "output"). ✅ VALID
✅ Line 2 (where): Syntax valid (field, operator, quoted value). ✅ VALID
✅ Line 3 (aggr): Syntax valid (function, field, alias, groupby). ✅ VALID
✅ Line 4 (sort): Syntax valid (field, order). ✅ VALID
✅ Line 5 (fields): Syntax valid (field with alias). ✅ VALID
✅ Line 6 (iplocation): Syntax valid (parameter, field). ✅ VALID
All syntax correct → valid = true. NO field availability checks performed.

IMPORTANT SYNTAX RULES:
1. Field names should NEVER be enclosed in quotes. Only string values should be quoted with DOUBLE quotes.
   Correct: where tenantId = \"value\"
   Wrong: where \"tenantId\" = \"value\"
2. String values MUST be enclosed in DOUBLE quotes (not single quotes)
   Correct: where action = \"login\"
   Wrong: where action = 'login'
3. Lists use parentheses with comma-separated quoted values:
   Correct: where status in (\"failed\", \"blocked\")
   Wrong: where status in [\"failed\", \"blocked\"]
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { prompt, query, fields, apiKey, mode = 'generate', supabaseUrl, supabaseKey }: RequestBody = body;

    console.log('Received request:', { mode, prompt, query, fieldsCount: fields?.length, hasApiKey: !!apiKey });

    let trainingSamplesContext = '';
    if (supabaseUrl && supabaseKey) {
      try {
        const samplesResponse = await fetch(`${supabaseUrl}/rest/v1/training_samples?order=created_at.desc&limit=10`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (samplesResponse.ok) {
          const samples = await samplesResponse.json();
          if (samples && samples.length > 0) {
            trainingSamplesContext = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FEW-SHOT TRAINING SAMPLES - SYNTAX & STYLE REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CRITICAL INSTRUCTION: The user has provided training samples below. These are FEW-SHOT EXAMPLES that show syntax and formatting style ONLY.

WHAT TRAINING SAMPLES ARE:
✅ Examples of valid AQL syntax and structure
✅ Style guide for formatting queries (pipes, operators, time filters)
✅ Reference for operator ordering and logical operators (and/or)
✅ Templates showing how to write clean, production-ready queries

WHAT TRAINING SAMPLES ARE NOT:
❌ The complete universe of all possible use cases
❌ A restriction on what queries you can generate
❌ Limited to only the scenarios shown in examples
❌ Tied to specific log sources or field names in the samples

YOUR JOB AS AI ASSISTANT:
1. **Generalize Beyond Samples:** Use AQL syntax from the Search User Guide to create ANY query the user requests, even if not in training samples
2. **Style Consistency:** Match formatting style from samples (time filter syntax, operator ordering, lowercase and/or)
3. **New Use Cases:** When user asks for \"10 new use cases\" or \"different scenarios\", invent fresh, relevant queries using correct AQL syntax
4. **Any Log Source:** Generate queries for Windows, O365, AWS, DNS, Firewall, etc. - even if not in uploaded dataset (use placeholder fields if needed)
5. **User Intent First:** Prioritize user's request over sample limitations. Training samples = syntax guide, NOT use case restrictions

EXAMPLE OF CORRECT BEHAVIOR:
- Training samples show: \"Excessive failed logins\"
- User asks: \"Give me 5 O365 insider threat use cases\"
- ✅ CORRECT: Generate NEW queries for mailbox forwarding, impossible travel, suspicious file sharing, large downloads, etc.
- ❌ WRONG: Say \"I can only help with failed logins based on training samples\"

FORMATTING RULES FROM SAMPLES:
1. Copy their time filter syntax (e.g., \"earliest=-1h, latest=now\" if that's the style)
2. Match their operator ordering
3. Use their logical operator style (lowercase \"and\"/\"or\" if they use it)
4. Copy whether they start with pipe \"|\" or sourcetype
5. When creating NEW queries, follow same formatting style but with DIFFERENT use cases

FEW-SHOT TRAINING SAMPLES (Syntax & Style Examples):\n\n`;

            samples.forEach((sample: any, index: number) => {
              trainingSamplesContext += `### Training Sample ${index + 1} (${sample.sample_type})`;
              if (sample.description) {
                trainingSamplesContext += ` - ${sample.description}`;
              }
              trainingSamplesContext += `\n\`\`\`\n${sample.content}\n\`\`\`\n\n`;
            });

            trainingSamplesContext += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

            console.log(`Loaded ${samples.length} training samples`);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch training samples:', error);
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add exempt fields to the fields list so AI doesn't flag them
    const exemptFields = ['sourcetype', 'event_time', '_time', 'index', 'host', 'source', 'dcid'];
    const allFields = fields && fields.length > 0 ? [...new Set([...fields, ...exemptFields])] : exemptFields;

    const fieldsContext = fields && fields.length > 0
      ? `Available fields in the dataset: ${fields.join(", ")}

CRITICAL: These are the ACTUAL fields from the uploaded CSV/JSON file. Accept ANY field that appears in this list.

Exempt metadata fields (always valid, even if not in list above): sourcetype, event_time, _time, index, host, source, dcid`
      : "ERROR: No fields available. The user must upload a log file before you can generate queries.";

    let systemPrompt: string;
    let userMessage: string;

    if (mode === 'validate') {
      systemPrompt = `${trainingSamplesContext}

${VALIDATE_PROMPT}

${fieldsContext}`;
      userMessage = `Validate this AQL query (SYNTAX-ONLY):
${query}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL: SYNTAX-ONLY VALIDATION, NO FIELD AVAILABILITY CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDATION MODE: SYNTAX CHECK ONLY

YOUR ONLY JOB:
✅ Check if syntax is correct (operators, quotes, parentheses, keywords)
❌ DO NOT validate field availability in dataset
❌ DO NOT check if fields exist in Available Fields
❌ DO NOT flag "field not found" errors
❌ DO NOT suggest alternate field names

WHY NO FIELD CHECKS:
- Fields may come from calc/eval (computed fields)
- Fields may come from lookup tables (not in dataset)
- Fields may be renamed with "as" (user-defined aliases)
- String literals like "SAD" are query values, not dataset fields
- User knows their data better than validator

EXAMPLES THAT MUST PASS:
✅ |where timestamp = "2024-10-01"
   → Syntax correct → VALID (don't check if timestamp in dataset)

✅ |where failed_logins > 5
   → Syntax correct (numeric value unquoted) → VALID

✅ |where failed_logins > "5"
   → Syntax correct (numeric value quoted) → VALID
   → Both quoted and unquoted numbers are valid in AQL

✅ |where bytes_in >= "1000"
   → Syntax correct (quoted number) → VALID

✅ |aggr count(dcid) as id_count by app_type
   → Syntax correct (with by clause) → VALID

✅ |aggr count(timestamp) as asd by timestamp
   → Syntax correct (with by clause) → VALID

✅ |aggr count() as total
   → Syntax correct (without by clause) → VALID
   → The "by" clause is OPTIONAL in aggr

✅ |eventstats count(timestamp) as total_count
   → Syntax correct (without by clause) → VALID
   → The "by" clause is OPTIONAL in eventstats

✅ |eventstats count() as total by user
   → Syntax correct (with by clause) → VALID

✅ |timetrend count(timestamp) span=1h
   → Syntax correct (without by clause) → VALID
   → The "by" clause is OPTIONAL in timetrend

✅ |timetrend count() by app_type span=1h
   → Syntax correct (with by clause) → VALID

✅ |lookup geo_table on geo_ip = src_ip output country as user_country, city
   → Syntax correct (has "on" and "output") → VALID (no field checks)

✅ |fields timestamp as time, src_ip, dest_ip
   → Syntax correct → VALID (don't check if fields in dataset)

ONLY FLAG SYNTAX ERRORS:
❌ |where action = login (missing quotes around string value)
❌ |lookup table field = field (missing "on" and "output" keywords)
❌ |aggr count(field as cnt (unbalanced parentheses)

DO NOT FLAG THESE:
✅ |where count = "10" (quoted number is VALID)
✅ |where bytes > "1000" (quoted number is VALID)
✅ |aggr count() as total (no "by" clause is VALID)
✅ |eventstats count() as total (no "by" clause is VALID)
✅ |timetrend count() span=1h (no "by" clause is VALID)

REMINDER: If syntax is correct → valid = true. Period.

${trainingSamplesContext ? 'REMINDER: Training samples were provided at the TOP of the system prompt. These are FEW-SHOT EXAMPLES showing formatting style and syntax patterns. When generating correctedQuery, match their formatting style (operator ordering, time filter format like earliest=-1h latest=now, lowercase and/or). The samples show STYLE, not use case limits.' : ''}`;
    } else {
      // Generate mode - ALWAYS generate a query even without uploaded fields
      const fieldGuidance = fields && fields.length > 0
        ? `

Available fields from uploaded log: ${allFields.join(", ")}

Prefer using these fields if they match the use case. If they don't match, infer standard fields for the appropriate sourcetype.`
        : `

No uploaded log fields available. Infer standard fields based on the sourcetype (e.g., windows_event, aws_cloudtrail, proofpoint, etc.).`;

      systemPrompt = `${trainingSamplesContext}

${GENERATE_PROMPT}${fieldGuidance}`;
      userMessage = `Create an AQL query for: ${prompt}

REQUIREMENTS:
- ALWAYS start with: | where sourcetype="..." (appropriate for this use case)
- Use uploaded fields if available and relevant, otherwise infer standard fields
- Follow training sample patterns exactly${trainingSamplesContext ? '\n\nCRITICAL: Training samples at TOP of system prompt are MANDATORY templates. Copy their EXACT structure, time filter syntax (earliest=-1h, latest=now), and operator ordering. Only adapt field names.' : ''}`;
    }

    console.log('Calling OpenAI API...');

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API error",
          details: errorData 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    console.log('OpenAI response:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});