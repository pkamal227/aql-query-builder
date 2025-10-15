export const AQL_SEARCH_GUIDE = `
# AQL (Analytics Query Language) Search Guide

## Query Structure
AQL queries are composed of operators connected by pipes (|). Each operator processes data and passes results to the next.

Example: where status = "active" | aggr count() as total by user | sort total desc

## Operator Categories

### 1. Comparison & Filtering
- **where**: Filter events based on conditions
  Example: where sourcetype = "ms_defender"
  Example: where severity > 3 AND status = "open"
  Example: where event_time latest=1h (events from last hour)
  Example: where timestamp earliest=-24h latest=-1h (24h-1h ago)

- **cofilter**: Co-occurrence filtering across multiple fields
- **Comparison operators**: =, !=, <, >, <=, >=
- **String operators**: contains, contains_ci, startswith, endswith, like, match
- **List operators**: in, not in
- **Null checks**: isnull, isnotnull
- **Type checks**: isnum, isoutlier
- **Time filters**: latest=<duration>, earliest=<duration>
  Durations: 1h, 24h, 7d, 30d
  Note: Do NOT use "now() - 1h" syntax

### 2. Aggregation
- **aggr**: Aggregate data with functions
  Example: aggr count(user) as count_user by src_ip, dest_ip
  Example: aggr sum(bytes) as total_bytes by host
  Functions: count(), sum(), avg(), min(), max(), median(), perc(), stdev(), var()

- **timechart**: Create time-based aggregations
  Example: timechart span=1h count() by status

- **timetrend**: Analyze trends over time

- **top**: Find most common values
  Example: top 10 user
  Example: top src_ip by count

- **rare**: Find least common values
  Example: rare 5 error_code

- **eventstats**: Add aggregate statistics to each event without grouping

### 3. Field Operations
- **fields**: Select specific fields to return
  Example: fields timestamp, user, action, src_ip

- **setfields**: Set or modify field values

- **fieldsummary**: Get summary statistics for fields

- **uniq**: Get unique values for fields

### 4. Sorting & Limiting
- **sort**: Sort results by field
  Example: sort timestamp desc
  Example: sort user asc, timestamp desc

- **head**: Return first N results
  Example: head 100

- **tail**: Return last N results
  Example: tail 50

- **limit**: Limit number of results
  Example: limit 1000

- **dedup**: Remove duplicate events
  Example: dedup user

- **reverse**: Reverse order of results

### 5. String Manipulation
- **calc**: Create or modify fields with expressions
  Example: calc login_status = if(status="200","success","failure")
  Example: calc bytes_total = bytes_in + bytes_out

- **rex**: Extract data using regex or sed-style substitutions
  Example: rex field=url "https://(?<hostname>[^/]+)/"
  Example: rex mode=sed field=message "s/error/alert/g"

- **spath**: Extract fields from JSON structures
  Example: spath input=message output=user_id path="$.user.id"

- **replace**: Replace values in string fields
  Example: replace "http://" WITH "https://" IN url

### 6. Data Transformation
- **fields**: Limit output to specific fields
  Example: fields event_time, src_ip, dest_ip, action

- **setfields**: Rename fields or create aliases
  Example: setfields client_ip=src_ip, server_ip=dest_ip

- **fieldsummary**: Show summary stats for a field
  Example: fieldsummary src_ip

- **fillnull**: Replace nulls with a default value
  Example: fillnull value="unknown" user_agent

- **filldown**: Forward-fill nulls with previous row's value
  Example: filldown session_id

- **makemv**: Split a string into a multivalue field
  Example: makemv delim="," email_addresses

- **mvcombine**: Combine multiple rows into a single multivalue field
  Example: mvcombine domains

- **mvexpand**: Expand multivalue fields into separate rows
  Example: mvexpand email_addresses

- **nomv**: Collapse multivalue field into one
  Example: nomv domains

### 7. Field Operations
- **apply**: Apply a reusable rule or function to a field
  Example: apply url_normalize url

- **return**: Return values from a subquery, optionally aliased
  Example: return user, $src_ip, hostname=dest

### 8. Enrichment & Threat Intelligence
- **lookup**: Enrich logs by joining with lookup tables
  Example: lookup threatintel on url like domain output threat_level, category

- **iplocation**: Enrich IP with geo info
  Example: iplocation prefix=geo_ src_ip

- **whois**: Enrich with WHOIS data
  Example: whois domain

### 9. Misc & Utility
- **addinfo**: Add metadata about search (time ranges, etc.)
  Example: addinfo

- **reltime**: Filter with relative time windows
  Example: where earliest=-1h latest=now

- **yieldtable**: Write results into a lookup table
  Example: yieldtable suspicious_users append=true

## Common Query Patterns

### Pattern 1: Filter, Aggregate, Sort
where status = "failed" | aggr count() as failure_count by user | sort failure_count desc

### Pattern 2: Time-based Analysis
where event_time latest=24h | timechart span=1h count() by severity

### Pattern 2b: Failed Login Detection (Last Hour)
where action = "failed_login" | where event_time latest=1h | aggr count() as failed_attempts by user | sort failed_attempts desc

### Pattern 3: Top N Analysis
where event_type = "login" | top 10 user by count | sort count desc

### Pattern 4: Statistical Analysis
where metric_name = "response_time" | aggr avg(value) as avg_time, max(value) as max_time by service

### Pattern 5: Field Extraction and Filtering
rex field=message "error_code=(?<code>\\d+)" | where code = "500" | top code

### Pattern 6: Multi-level Grouping
where severity > 5 | aggr count() as alert_count by src_ip, dest_ip, action | sort alert_count desc | head 20

## Tips
1. Always start with filtering (where) to reduce data volume
2. Use appropriate aggregation functions for your data type
3. Add aliases (as) to make results readable
4. Group by relevant dimensions for meaningful insights
5. Sort and limit results for performance
6. Chain operators with pipe (|) for complex analysis
`;
