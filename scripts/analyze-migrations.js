#!/usr/bin/env node
/**
 * Migration Analysis Script
 *
 * Analyzes your migration files to identify all database objects created
 * and helps track which migrations created which objects.
 *
 * Usage:
 *   node scripts/analyze-migrations.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migration directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      filename: file,
      path: path.join(MIGRATIONS_DIR, file),
      timestamp: file.split('_')[0]
    }));
}

function analyzeMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const analysis = {
    tables: [],
    columns: [],
    functions: [],
    triggers: [],
    policies: [],
    indexes: [],
    views: [],
    enums: [],
    constraints: [],
    drops: []
  };

  // Simple pattern matching (not perfect but good enough for analysis)
  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();

    // Tables
    if (cleanLine.match(/CREATE TABLE.*IF NOT EXISTS/i) || cleanLine.match(/CREATE TABLE/i)) {
      const match = line.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([^\s(]+)/i);
      if (match) analysis.tables.push(match[1]);
    }

    // Functions
    if (cleanLine.match(/CREATE(?:\s+OR REPLACE)?\s+FUNCTION/i)) {
      const match = line.match(/CREATE(?:\s+OR REPLACE)?\s+FUNCTION\s+([^\s(]+)/i);
      if (match) analysis.functions.push(match[1]);
    }

    // Triggers
    if (cleanLine.match(/CREATE TRIGGER/i)) {
      const match = line.match(/CREATE TRIGGER\s+([^\s]+)/i);
      if (match) analysis.triggers.push(match[1]);
    }

    // Policies
    if (cleanLine.match(/CREATE POLICY/i)) {
      const match = line.match(/CREATE POLICY\s+([^\s]+)/i);
      if (match) analysis.policies.push(match[1]);
    }

    // Indexes
    if (cleanLine.match(/CREATE(?:\s+UNIQUE)?\s+INDEX/i)) {
      const match = line.match(/CREATE(?:\s+UNIQUE)?\s+INDEX\s+([^\s]+)/i);
      if (match) analysis.indexes.push(match[1]);
    }

    // Views
    if (cleanLine.match(/CREATE(?:\s+OR REPLACE)?\s+VIEW/i)) {
      const match = line.match(/CREATE(?:\s+OR REPLACE)?\s+VIEW\s+([^\s]+)/i);
      if (match) analysis.views.push(match[1]);
    }

    // Enums
    if (cleanLine.match(/CREATE TYPE.*AS ENUM/i)) {
      const match = line.match(/CREATE TYPE\s+([^\s]+)/i);
      if (match) analysis.enums.push(match[1]);
    }

    // Columns added
    if (cleanLine.match(/ALTER TABLE.*ADD COLUMN/i)) {
      const match = line.match(/ALTER TABLE\s+([^\s]+).*ADD COLUMN\s+([^\s]+)/i);
      if (match) analysis.columns.push(`${match[1]}.${match[2]}`);
    }

    // Constraints
    if (cleanLine.match(/ALTER TABLE.*ADD CONSTRAINT/i)) {
      const match = line.match(/ADD CONSTRAINT\s+([^\s]+)/i);
      if (match) analysis.constraints.push(match[1]);
    }

    // Drops
    if (cleanLine.match(/DROP TABLE/i)) {
      const match = line.match(/DROP TABLE\s+(?:IF EXISTS\s+)?([^\s;]+)/i);
      if (match) analysis.drops.push({ type: 'TABLE', name: match[1] });
    }
    if (cleanLine.match(/DROP FUNCTION/i)) {
      const match = line.match(/DROP FUNCTION\s+(?:IF EXISTS\s+)?([^\s(;]+)/i);
      if (match) analysis.drops.push({ type: 'FUNCTION', name: match[1] });
    }
    if (cleanLine.match(/DROP INDEX/i)) {
      const match = line.match(/DROP INDEX\s+(?:IF EXISTS\s+)?([^\s;]+)/i);
      if (match) analysis.drops.push({ type: 'INDEX', name: match[1] });
    }
  }

  return analysis;
}

function generateReport(migrations) {
  let report = '# Database Migration Analysis\n\n';
  report += `**Generated:** ${new Date().toLocaleString()}\n`;
  report += `**Migrations Analyzed:** ${migrations.length}\n\n`;

  // Summary by migration
  report += '## Migrations Summary\n\n';
  report += '| Migration | Tables | Functions | Triggers | Policies | Indexes | Views | Drops |\n';
  report += '|-----------|--------|-----------|----------|----------|---------|-------|-------|\n';

  for (const migration of migrations) {
    const { filename, analysis } = migration;
    report += `| ${filename} | ${analysis.tables.length} | ${analysis.functions.length} | ${analysis.triggers.length} | ${analysis.policies.length} | ${analysis.indexes.length} | ${analysis.views.length} | ${analysis.drops.length} |\n`;
  }
  report += '\n';

  // All objects by type
  const allTables = new Set();
  const allFunctions = new Set();
  const allTriggers = new Set();
  const allPolicies = new Set();
  const allIndexes = new Set();
  const allViews = new Set();
  const allEnums = new Set();
  const allDrops = [];

  for (const migration of migrations) {
    migration.analysis.tables.forEach(t => allTables.add(t));
    migration.analysis.functions.forEach(f => allFunctions.add(f));
    migration.analysis.triggers.forEach(t => allTriggers.add(t));
    migration.analysis.policies.forEach(p => allPolicies.add(p));
    migration.analysis.indexes.forEach(i => allIndexes.add(i));
    migration.analysis.views.forEach(v => allViews.add(v));
    migration.analysis.enums.forEach(e => allEnums.add(e));
    allDrops.push(...migration.analysis.drops.map(d => ({
      ...d,
      migration: migration.filename
    })));
  }

  report += '## Summary of All Objects\n\n';
  report += `- **Tables Created:** ${allTables.size}\n`;
  report += `- **Functions Created:** ${allFunctions.size}\n`;
  report += `- **Triggers Created:** ${allTriggers.size}\n`;
  report += `- **Policies Created:** ${allPolicies.size}\n`;
  report += `- **Indexes Created:** ${allIndexes.size}\n`;
  report += `- **Views Created:** ${allViews.size}\n`;
  report += `- **Enums Created:** ${allEnums.size}\n`;
  report += `- **Objects Dropped:** ${allDrops.length}\n\n`;

  // Detailed object lists
  report += '## All Tables\n\n';
  Array.from(allTables).sort().forEach(table => {
    const source = migrations.find(m => m.analysis.tables.includes(table));
    report += `- \`${table}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Functions\n\n';
  Array.from(allFunctions).sort().forEach(func => {
    const source = migrations.find(m => m.analysis.functions.includes(func));
    report += `- \`${func}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Policies\n\n';
  Array.from(allPolicies).sort().forEach(policy => {
    const source = migrations.find(m => m.analysis.policies.includes(policy));
    report += `- \`${policy}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Triggers\n\n';
  Array.from(allTriggers).sort().forEach(trigger => {
    const source = migrations.find(m => m.analysis.triggers.includes(trigger));
    report += `- \`${trigger}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Views\n\n';
  Array.from(allViews).sort().forEach(view => {
    const source = migrations.find(m => m.analysis.views.includes(view));
    report += `- \`${view}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Indexes\n\n';
  Array.from(allIndexes).sort().forEach(index => {
    const source = migrations.find(m => m.analysis.indexes.includes(index));
    report += `- \`${index}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  report += '## All Enums\n\n';
  Array.from(allEnums).sort().forEach(enumType => {
    const source = migrations.find(m => m.analysis.enums.includes(enumType));
    report += `- \`${enumType}\` (from \`${source.filename}\`)\n`;
  });
  report += '\n';

  // Dropped objects
  if (allDrops.length > 0) {
    report += '## Dropped Objects\n\n';
    allDrops.forEach(drop => {
      report += `- **${drop.type}** \`${drop.name}\` (dropped in \`${drop.migration}\`)\n`;
    });
    report += '\n';
  }

  // Migration timeline
  report += '## Migration Timeline\n\n';
  for (const migration of migrations) {
    report += `### ${migration.filename}\n\n`;

    if (migration.analysis.tables.length > 0) {
      report += '**Tables:**\n';
      migration.analysis.tables.forEach(t => report += `- ${t}\n`);
      report += '\n';
    }

    if (migration.analysis.functions.length > 0) {
      report += '**Functions:**\n';
      migration.analysis.functions.forEach(f => report += `- ${f}\n`);
      report += '\n';
    }

    if (migration.analysis.triggers.length > 0) {
      report += '**Triggers:**\n';
      migration.analysis.triggers.forEach(t => report += `- ${t}\n`);
      report += '\n';
    }

    if (migration.analysis.policies.length > 0) {
      report += '**Policies:**\n';
      migration.analysis.policies.forEach(p => report += `- ${p}\n`);
      report += '\n';
    }

    if (migration.analysis.indexes.length > 0) {
      report += '**Indexes:**\n';
      migration.analysis.indexes.forEach(i => report += `- ${i}\n`);
      report += '\n';
    }

    if (migration.analysis.views.length > 0) {
      report += '**Views:**\n';
      migration.analysis.views.forEach(v => report += `- ${v}\n`);
      report += '\n';
    }

    if (migration.analysis.drops.length > 0) {
      report += '**Dropped:**\n';
      migration.analysis.drops.forEach(d => report += `- ${d.type}: ${d.name}\n`);
      report += '\n';
    }
  }

  return report;
}

function main() {
  console.log('🔍 Analyzing migration files...\n');

  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.error('No migration files found!');
    return;
  }

  console.log(`Found ${migrationFiles.length} migration files\n`);

  const migrations = migrationFiles.map(file => ({
    ...file,
    analysis: analyzeMigrationFile(file.path)
  }));

  const report = generateReport(migrations);

  const outputPath = path.join(process.cwd(), 'migration-analysis.md');
  fs.writeFileSync(outputPath, report);

  console.log(`✅ Analysis complete!`);
  console.log(`📄 Report saved to: ${outputPath}\n`);

  // Print summary
  const totalTables = new Set(migrations.flatMap(m => m.analysis.tables)).size;
  const totalFunctions = new Set(migrations.flatMap(m => m.analysis.functions)).size;
  const totalPolicies = new Set(migrations.flatMap(m => m.analysis.policies)).size;
  const totalTriggers = new Set(migrations.flatMap(m => m.analysis.triggers)).size;

  console.log('📊 Summary:');
  console.log(`   Migrations: ${migrations.length}`);
  console.log(`   Tables: ${totalTables}`);
  console.log(`   Functions: ${totalFunctions}`);
  console.log(`   Policies: ${totalPolicies}`);
  console.log(`   Triggers: ${totalTriggers}\n`);

  console.log('💡 Next steps:');
  console.log('   1. Review the migration analysis report');
  console.log('   2. Run the audit queries in Supabase SQL Editor');
  console.log('   3. Compare migration objects with actual database objects');
  console.log('   4. Identify objects in DB but not in migrations (manual additions)');
  console.log('   5. Identify objects in migrations but not in DB (might have been dropped)\n');
}

main();
