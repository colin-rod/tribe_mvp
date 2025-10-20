#!/usr/bin/env tsx
/**
 * Supabase Backend Audit Script
 *
 * This script extracts all database objects from your Supabase backend:
 * - Tables and columns
 * - Row Level Security (RLS) policies
 * - Database functions
 * - Triggers
 * - Views
 * - Indexes
 * - Foreign key constraints
 * - Enums
 * - Storage buckets and policies
 *
 * Usage:
 *   npm install pg @types/pg
 *   npx tsx scripts/audit-supabase-backend.ts
 *
 * Output:
 *   - Console output with summary
 *   - JSON file: supabase-audit-report.json
 *   - Markdown report: supabase-audit-report.md
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://advbcfkisejskhskrmqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AuditReport {
  generatedAt: string;
  summary: {
    totalTables: number;
    totalColumns: number;
    totalPolicies: number;
    totalFunctions: number;
    totalTriggers: number;
    totalViews: number;
    totalIndexes: number;
    totalEnums: number;
    totalStorageBuckets: number;
  };
  tables: TableInfo[];
  policies: PolicyInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
  views: ViewInfo[];
  indexes: IndexInfo[];
  enums: EnumInfo[];
  foreignKeys: ForeignKeyInfo[];
  storageBuckets: StorageBucketInfo[];
  storageRLSPolicies: StorageRLSPolicy[];
}

interface TableInfo {
  schema: string;
  name: string;
  rowCount: number | null;
  columns: ColumnInfo[];
  rlsEnabled: boolean;
  description: string | null;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string | null;
}

interface PolicyInfo {
  schema: string;
  table: string;
  policyName: string;
  command: string;
  permissive: string;
  roles: string[];
  usingExpression: string | null;
  checkExpression: string | null;
}

interface FunctionInfo {
  schema: string;
  name: string;
  returnType: string;
  language: string;
  argumentTypes: string;
  isSecurityDefiner: boolean;
  definition: string;
  description: string | null;
}

interface TriggerInfo {
  schema: string;
  table: string;
  triggerName: string;
  event: string;
  timing: string;
  functionName: string;
  enabled: boolean;
}

interface ViewInfo {
  schema: string;
  name: string;
  definition: string;
  isSecurityDefiner: boolean;
}

interface IndexInfo {
  schema: string;
  table: string;
  indexName: string;
  columns: string[];
  indexType: string;
  isUnique: boolean;
  isPrimaryKey: boolean;
  definition: string;
}

interface EnumInfo {
  schema: string;
  name: string;
  values: string[];
}

interface ForeignKeyInfo {
  schema: string;
  table: string;
  constraintName: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
}

interface StorageBucketInfo {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number | null;
  allowedMimeTypes: string[] | null;
}

interface StorageRLSPolicy {
  bucket: string;
  policyName: string;
  definition: string;
}

// SQL Queries
const QUERIES = {
  // Get all tables with RLS status
  tables: `
    SELECT
      schemaname as schema,
      tablename as name,
      obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') as description
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
    ORDER BY schemaname, tablename;
  `,

  // Get RLS status for tables
  rlsStatus: `
    SELECT
      schemaname as schema,
      tablename as table,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
    ORDER BY schemaname, tablename;
  `,

  // Get columns for a table
  columns: `
    SELECT
      c.column_name as name,
      c.data_type as data_type,
      c.is_nullable = 'YES' as is_nullable,
      c.column_default as default_value,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
      CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
      pgd.description
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.table_schema, ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_schema = pk.table_schema
      AND c.table_name = pk.table_name
      AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT ku.table_schema, ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON c.table_schema = fk.table_schema
      AND c.table_name = fk.table_name
      AND c.column_name = fk.column_name
    LEFT JOIN pg_catalog.pg_statio_all_tables st ON c.table_schema = st.schemaname
      AND c.table_name = st.relname
    LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid
      AND pgd.objsubid = c.ordinal_position
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position;
  `,

  // Get all RLS policies
  policies: `
    SELECT
      schemaname as schema,
      tablename as table,
      policyname as policy_name,
      permissive,
      cmd as command,
      roles,
      qual as using_expression,
      with_check as check_expression
    FROM pg_policies
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schemaname, tablename, policyname;
  `,

  // Get all functions
  functions: `
    SELECT
      n.nspname as schema,
      p.proname as name,
      pg_get_function_result(p.oid) as return_type,
      l.lanname as language,
      pg_get_function_arguments(p.oid) as argument_types,
      p.prosecdef as is_security_definer,
      pg_get_functiondef(p.oid) as definition,
      obj_description(p.oid, 'pg_proc') as description
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'vault')
      AND p.prokind = 'f'
    ORDER BY n.nspname, p.proname;
  `,

  // Get all triggers
  triggers: `
    SELECT
      trigger_schema as schema,
      event_object_table as table,
      trigger_name,
      string_agg(event_manipulation, ', ') as event,
      action_timing as timing,
      action_statement as function_name,
      CASE WHEN trigger_schema IS NOT NULL THEN true ELSE false END as enabled
    FROM information_schema.triggers
    WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
    GROUP BY trigger_schema, event_object_table, trigger_name, action_timing, action_statement
    ORDER BY trigger_schema, event_object_table, trigger_name;
  `,

  // Get all views
  views: `
    SELECT
      schemaname as schema,
      viewname as name,
      definition,
      false as is_security_definer
    FROM pg_views
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
    ORDER BY schemaname, viewname;
  `,

  // Get all indexes
  indexes: `
    SELECT
      schemaname as schema,
      tablename as table,
      indexname as index_name,
      indexdef as definition
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
    ORDER BY schemaname, tablename, indexname;
  `,

  // Get enum types
  enums: `
    SELECT
      n.nspname as schema,
      t.typname as name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    GROUP BY n.nspname, t.typname
    ORDER BY n.nspname, t.typname;
  `,

  // Get foreign keys
  foreignKeys: `
    SELECT
      tc.table_schema as schema,
      tc.table_name as table,
      tc.constraint_name,
      array_agg(kcu.column_name) as columns,
      ccu.table_name as referenced_table,
      array_agg(ccu.column_name) as referenced_columns,
      rc.delete_rule as on_delete,
      rc.update_rule as on_update
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, ccu.table_name, rc.delete_rule, rc.update_rule
    ORDER BY tc.table_schema, tc.table_name;
  `,
};

async function getTableRowCount(schema: string, table: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_table_row_count', {
        p_schema: schema,
        p_table: table
      });

    if (error) {
      // If function doesn't exist, try direct query (less safe)
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      return count;
    }

    return data;
  } catch (err) {
    console.warn(`Could not get row count for ${schema}.${table}:`, err);
    return null;
  }
}

async function getTables(): Promise<TableInfo[]> {
  const { data: tables, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.tables
  });

  if (error) {
    console.error('Error fetching tables:', error);
    return [];
  }

  const { data: rlsData } = await supabase.rpc('execute_sql', {
    query: QUERIES.rlsStatus
  });

  const rlsMap = new Map<string, boolean>(
    rlsData?.map((row: Record<string, unknown>) => [
      `${row.schema}.${row.table}`,
      row.rls_enabled as boolean
    ]) || []
  );

  const result: TableInfo[] = [];

  for (const table of tables || []) {
    const { data: columns } = await supabase.rpc('execute_sql', {
      query: QUERIES.columns,
      params: [table.schema, table.name]
    });

    const rowCount = await getTableRowCount(table.schema, table.name);

    result.push({
      schema: table.schema,
      name: table.name,
      rowCount,
      columns: columns || [],
      rlsEnabled: rlsMap.get(`${table.schema}.${table.name}`) ?? false,
      description: table.description,
    });
  }

  return result;
}

async function getPolicies(): Promise<PolicyInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.policies
  });

  if (error) {
    console.error('Error fetching policies:', error);
    return [];
  }

  return data || [];
}

async function getFunctions(): Promise<FunctionInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.functions
  });

  if (error) {
    console.error('Error fetching functions:', error);
    return [];
  }

  return data || [];
}

async function getTriggers(): Promise<TriggerInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.triggers
  });

  if (error) {
    console.error('Error fetching triggers:', error);
    return [];
  }

  return data || [];
}

async function getViews(): Promise<ViewInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.views
  });

  if (error) {
    console.error('Error fetching views:', error);
    return [];
  }

  return data || [];
}

async function getIndexes(): Promise<IndexInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.indexes
  });

  if (error) {
    console.error('Error fetching indexes:', error);
    return [];
  }

  return (data || []).map((idx: Record<string, unknown>) => {
    // Parse index definition to extract details
    const def = idx.definition as string;
    const isUnique = def.includes('UNIQUE');
    const isPrimaryKey = def.includes('PRIMARY KEY');

    // Extract columns from definition
    const columnsMatch = def.match(/\((.*?)\)/);
    const columns = columnsMatch
      ? columnsMatch[1].split(',').map(c => c.trim())
      : [];

    // Extract index type
    const typeMatch = def.match(/USING (\w+)/);
    const indexType = typeMatch ? typeMatch[1] : 'btree';

    return {
      schema: idx.schema,
      table: idx.table,
      indexName: idx.index_name,
      columns,
      indexType,
      isUnique,
      isPrimaryKey,
      definition: def,
    };
  });
}

async function getEnums(): Promise<EnumInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.enums
  });

  if (error) {
    console.error('Error fetching enums:', error);
    return [];
  }

  return data || [];
}

async function getForeignKeys(): Promise<ForeignKeyInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: QUERIES.foreignKeys
  });

  if (error) {
    console.error('Error fetching foreign keys:', error);
    return [];
  }

  return data || [];
}

async function getStorageBuckets(): Promise<StorageBucketInfo[]> {
  const { data, error } = await supabase
    .storage
    .listBuckets();

  if (error) {
    console.error('Error fetching storage buckets:', error);
    return [];
  }

  return data.map(bucket => ({
    id: bucket.id,
    name: bucket.name,
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit || null,
    allowedMimeTypes: bucket.allowed_mime_types || null,
  }));
}

async function getStorageRLSPolicies(): Promise<StorageRLSPolicy[]> {
  const storageRLSQuery = `
    SELECT
      bucket_id as bucket,
      name as policy_name,
      definition
    FROM storage.policies
    ORDER BY bucket_id, name;
  `;

  const { data, error } = await supabase.rpc('execute_sql', {
    query: storageRLSQuery
  });

  if (error) {
    console.error('Error fetching storage RLS policies:', error);
    return [];
  }

  return data || [];
}

async function generateAuditReport(): Promise<AuditReport> {
  console.log('🔍 Starting Supabase backend audit...\n');

  console.log('📋 Fetching tables and columns...');
  const tables = await getTables();

  console.log('🔒 Fetching RLS policies...');
  const policies = await getPolicies();

  console.log('⚙️  Fetching database functions...');
  const functions = await getFunctions();

  console.log('⚡ Fetching triggers...');
  const triggers = await getTriggers();

  console.log('👁️  Fetching views...');
  const views = await getViews();

  console.log('📇 Fetching indexes...');
  const indexes = await getIndexes();

  console.log('🏷️  Fetching enum types...');
  const enums = await getEnums();

  console.log('🔗 Fetching foreign keys...');
  const foreignKeys = await getForeignKeys();

  console.log('🗂️  Fetching storage buckets...');
  const storageBuckets = await getStorageBuckets();

  console.log('🔐 Fetching storage RLS policies...');
  const storageRLSPolicies = await getStorageRLSPolicies();

  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTables: tables.length,
      totalColumns,
      totalPolicies: policies.length,
      totalFunctions: functions.length,
      totalTriggers: triggers.length,
      totalViews: views.length,
      totalIndexes: indexes.length,
      totalEnums: enums.length,
      totalStorageBuckets: storageBuckets.length,
    },
    tables,
    policies,
    functions,
    triggers,
    views,
    indexes,
    enums,
    foreignKeys,
    storageBuckets,
    storageRLSPolicies,
  };

  return report;
}

function generateMarkdownReport(report: AuditReport): string {
  let md = '# Supabase Backend Audit Report\n\n';
  md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;

  // Summary
  md += '## Summary\n\n';
  md += `- **Tables:** ${report.summary.totalTables}\n`;
  md += `- **Columns:** ${report.summary.totalColumns}\n`;
  md += `- **RLS Policies:** ${report.summary.totalPolicies}\n`;
  md += `- **Functions:** ${report.summary.totalFunctions}\n`;
  md += `- **Triggers:** ${report.summary.totalTriggers}\n`;
  md += `- **Views:** ${report.summary.totalViews}\n`;
  md += `- **Indexes:** ${report.summary.totalIndexes}\n`;
  md += `- **Enum Types:** ${report.summary.totalEnums}\n`;
  md += `- **Storage Buckets:** ${report.summary.totalStorageBuckets}\n\n`;

  // Tables
  md += '## Tables\n\n';
  for (const table of report.tables) {
    md += `### ${table.schema}.${table.name}\n\n`;
    md += `- **RLS Enabled:** ${table.rlsEnabled ? '✅' : '❌'}\n`;
    md += `- **Row Count:** ${table.rowCount !== null ? table.rowCount.toLocaleString() : 'Unknown'}\n`;
    if (table.description) {
      md += `- **Description:** ${table.description}\n`;
    }
    md += '\n**Columns:**\n\n';
    md += '| Column | Type | Nullable | Default | PK | FK |\n';
    md += '|--------|------|----------|---------|-------|-----|\n';
    for (const col of table.columns) {
      md += `| ${col.name} | ${col.dataType} | ${col.isNullable ? '✓' : ''} | ${col.defaultValue || ''} | ${col.isPrimaryKey ? '✓' : ''} | ${col.isForeignKey ? '✓' : ''} |\n`;
    }
    md += '\n';
  }

  // RLS Policies
  md += '## RLS Policies\n\n';
  if (report.policies.length === 0) {
    md += '*No RLS policies found.*\n\n';
  } else {
    const policiesByTable = report.policies.reduce((acc, policy) => {
      const key = `${policy.schema}.${policy.table}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(policy);
      return acc;
    }, {} as Record<string, PolicyInfo[]>);

    for (const [table, policies] of Object.entries(policiesByTable)) {
      md += `### ${table}\n\n`;
      for (const policy of policies) {
        md += `**${policy.policyName}**\n`;
        md += `- Command: ${policy.command}\n`;
        md += `- Permissive: ${policy.permissive}\n`;
        md += `- Roles: ${policy.roles.join(', ')}\n`;
        if (policy.usingExpression) {
          md += `- Using: \`${policy.usingExpression}\`\n`;
        }
        if (policy.checkExpression) {
          md += `- Check: \`${policy.checkExpression}\`\n`;
        }
        md += '\n';
      }
    }
  }

  // Functions
  md += '## Database Functions\n\n';
  if (report.functions.length === 0) {
    md += '*No custom functions found.*\n\n';
  } else {
    for (const func of report.functions) {
      md += `### ${func.schema}.${func.name}\n\n`;
      md += `- **Returns:** ${func.returnType}\n`;
      md += `- **Language:** ${func.language}\n`;
      md += `- **Arguments:** ${func.argumentTypes || 'None'}\n`;
      md += `- **Security Definer:** ${func.isSecurityDefiner ? '✅' : '❌'}\n`;
      if (func.description) {
        md += `- **Description:** ${func.description}\n`;
      }
      md += '\n';
    }
  }

  // Triggers
  md += '## Triggers\n\n';
  if (report.triggers.length === 0) {
    md += '*No triggers found.*\n\n';
  } else {
    const triggersByTable = report.triggers.reduce((acc, trigger) => {
      const key = `${trigger.schema}.${trigger.table}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(trigger);
      return acc;
    }, {} as Record<string, TriggerInfo[]>);

    for (const [table, triggers] of Object.entries(triggersByTable)) {
      md += `### ${table}\n\n`;
      for (const trigger of triggers) {
        md += `- **${trigger.triggerName}**: ${trigger.timing} ${trigger.event} → ${trigger.functionName}\n`;
      }
      md += '\n';
    }
  }

  // Views
  md += '## Views\n\n';
  if (report.views.length === 0) {
    md += '*No views found.*\n\n';
  } else {
    for (const view of report.views) {
      md += `### ${view.schema}.${view.name}\n\n`;
      md += '```sql\n';
      md += view.definition;
      md += '\n```\n\n';
    }
  }

  // Indexes
  md += '## Indexes\n\n';
  const indexesByTable = report.indexes.reduce((acc, idx) => {
    const key = `${idx.schema}.${idx.table}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(idx);
    return acc;
  }, {} as Record<string, IndexInfo[]>);

  for (const [table, indexes] of Object.entries(indexesByTable)) {
    md += `### ${table}\n\n`;
    for (const idx of indexes) {
      md += `- **${idx.indexName}**: ${idx.indexType.toUpperCase()} on (${idx.columns.join(', ')})`;
      if (idx.isUnique) md += ' - UNIQUE';
      if (idx.isPrimaryKey) md += ' - PRIMARY KEY';
      md += '\n';
    }
    md += '\n';
  }

  // Enums
  md += '## Enum Types\n\n';
  if (report.enums.length === 0) {
    md += '*No enum types found.*\n\n';
  } else {
    for (const enumType of report.enums) {
      md += `### ${enumType.schema}.${enumType.name}\n\n`;
      md += `Values: ${enumType.values.join(', ')}\n\n`;
    }
  }

  // Foreign Keys
  md += '## Foreign Key Constraints\n\n';
  const fksByTable = report.foreignKeys.reduce((acc, fk) => {
    const key = `${fk.schema}.${fk.table}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(fk);
    return acc;
  }, {} as Record<string, ForeignKeyInfo[]>);

  for (const [table, fks] of Object.entries(fksByTable)) {
    md += `### ${table}\n\n`;
    for (const fk of fks) {
      md += `- **${fk.constraintName}**: (${fk.columns.join(', ')}) → ${fk.referencedTable}(${fk.referencedColumns.join(', ')})\n`;
      md += `  - ON DELETE: ${fk.onDelete}\n`;
      md += `  - ON UPDATE: ${fk.onUpdate}\n`;
    }
    md += '\n';
  }

  // Storage Buckets
  md += '## Storage Buckets\n\n';
  if (report.storageBuckets.length === 0) {
    md += '*No storage buckets found.*\n\n';
  } else {
    for (const bucket of report.storageBuckets) {
      md += `### ${bucket.name}\n\n`;
      md += `- **ID:** ${bucket.id}\n`;
      md += `- **Public:** ${bucket.public ? '✅' : '❌'}\n`;
      if (bucket.fileSizeLimit) {
        md += `- **File Size Limit:** ${(bucket.fileSizeLimit / 1024 / 1024).toFixed(2)} MB\n`;
      }
      if (bucket.allowedMimeTypes) {
        md += `- **Allowed MIME Types:** ${bucket.allowedMimeTypes.join(', ')}\n`;
      }
      md += '\n';
    }
  }

  // Storage RLS Policies
  md += '## Storage RLS Policies\n\n';
  if (report.storageRLSPolicies.length === 0) {
    md += '*No storage RLS policies found.*\n\n';
  } else {
    const policiesByBucket = report.storageRLSPolicies.reduce((acc, policy) => {
      if (!acc[policy.bucket]) acc[policy.bucket] = [];
      acc[policy.bucket].push(policy);
      return acc;
    }, {} as Record<string, StorageRLSPolicy[]>);

    for (const [bucket, policies] of Object.entries(policiesByBucket)) {
      md += `### Bucket: ${bucket}\n\n`;
      for (const policy of policies) {
        md += `**${policy.policyName}**\n`;
        md += '```sql\n';
        md += policy.definition;
        md += '\n```\n\n';
      }
    }
  }

  return md;
}

async function main() {
  try {
    const report = await generateAuditReport();

    // Save JSON report
    const jsonPath = path.join(process.cwd(), 'supabase-audit-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON report saved to: ${jsonPath}`);

    // Save Markdown report
    const markdown = generateMarkdownReport(report);
    const mdPath = path.join(process.cwd(), 'supabase-audit-report.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Markdown report saved to: ${mdPath}`);

    // Print summary
    console.log('\n📊 Audit Summary:');
    console.log(`   Tables: ${report.summary.totalTables}`);
    console.log(`   Columns: ${report.summary.totalColumns}`);
    console.log(`   RLS Policies: ${report.summary.totalPolicies}`);
    console.log(`   Functions: ${report.summary.totalFunctions}`);
    console.log(`   Triggers: ${report.summary.totalTriggers}`);
    console.log(`   Views: ${report.summary.totalViews}`);
    console.log(`   Indexes: ${report.summary.totalIndexes}`);
    console.log(`   Enums: ${report.summary.totalEnums}`);
    console.log(`   Storage Buckets: ${report.summary.totalStorageBuckets}\n`);

    // Highlight potential issues
    console.log('⚠️  Potential Issues:');
    const tablesWithoutRLS = report.tables.filter(t => !t.rlsEnabled);
    if (tablesWithoutRLS.length > 0) {
      console.log(`   - ${tablesWithoutRLS.length} table(s) without RLS enabled:`);
      tablesWithoutRLS.forEach(t => console.log(`     • ${t.schema}.${t.name}`));
    }

    const tablesWithoutPolicies = report.tables.filter(t =>
      t.rlsEnabled && !report.policies.some(p => p.table === t.name)
    );
    if (tablesWithoutPolicies.length > 0) {
      console.log(`   - ${tablesWithoutPolicies.length} table(s) with RLS but no policies:`);
      tablesWithoutPolicies.forEach(t => console.log(`     • ${t.schema}.${t.name}`));
    }

    const securityDefinerFunctions = report.functions.filter(f => f.isSecurityDefiner);
    if (securityDefinerFunctions.length > 0) {
      console.log(`   - ${securityDefinerFunctions.length} SECURITY DEFINER function(s) (review carefully):`);
      securityDefinerFunctions.forEach(f => console.log(`     • ${f.schema}.${f.name}`));
    }

  } catch (error) {
    console.error('❌ Error generating audit report:', error);
    process.exit(1);
  }
}

main();
