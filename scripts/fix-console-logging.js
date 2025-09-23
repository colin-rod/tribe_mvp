#!/usr/bin/env node

/**
 * Script to systematically replace console.log statements with secure logging
 * Excludes test files, scripts, and documentation
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Directories to process (application code only)
const INCLUDE_DIRS = ['src/lib', 'src/hooks', 'src/components', 'src/app']

// Files to exclude
const EXCLUDE_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /test-/,
  /testing\//,
  /scripts\//,
  /\.md$/,
  /logger\.ts$/  // Don't modify the logger itself
]

// Console methods to replace
const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug']

function shouldProcessFile(filePath) {
  // Check if file is in included directories
  const isIncluded = INCLUDE_DIRS.some(dir => filePath.includes(dir))
  if (!isIncluded) return false

  // Check if file matches exclude patterns
  const isExcluded = EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
  if (isExcluded) return false

  // Only process TypeScript and TSX files
  return /\.(ts|tsx)$/.test(filePath)
}

function findFilesWithConsole() {
  const command = `find ${INCLUDE_DIRS.join(' ')} -name "*.ts" -o -name "*.tsx" | xargs grep -l "console\\." | grep -v test | grep -v spec`

  try {
    const output = execSync(command, { encoding: 'utf-8' })
    return output.trim().split('\n').filter(file => file && shouldProcessFile(file))
  } catch (error) {
    console.log('No more files with console statements found')
    return []
  }
}

function getLoggerImport(content) {
  if (content.includes("import { createLogger }")) {
    return { hasImport: true, importLine: null }
  }

  // Find the best place to add import
  const lines = content.split('\n')
  let importInsertIndex = 0

  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith("import {")) {
      importInsertIndex = i + 1
    } else if (lines[i].trim() === '' || lines[i].startsWith('//') || lines[i].startsWith('/*')) {
      continue
    } else {
      break
    }
  }

  return {
    hasImport: false,
    importLine: "import { createLogger } from '@/lib/logger'",
    insertAt: importInsertIndex
  }
}

function getComponentName(filePath) {
  const filename = path.basename(filePath, path.extname(filePath))
  // Convert kebab-case or snake_case to PascalCase
  return filename
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function addLoggerInstance(content, filePath) {
  const componentName = getComponentName(filePath)

  // Check if logger is already defined
  if (content.includes('createLogger(') || content.includes('= logger') || content.includes('const logger')) {
    return content
  }

  const lines = content.split('\n')

  // For React components, add logger inside the component
  if (content.includes('export function ') || content.includes('export const ')) {
    // Find the function/component start
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export function ') || lines[i].includes('export const ')) {
        // Look for the opening brace or function body
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('{') || lines[j + 1]?.trim().startsWith('const ')) {
            // Insert logger after the opening brace
            lines.splice(j + 1, 0, `  const logger = createLogger('${componentName}')`)
            return lines.join('\n')
          }
        }
      }
    }
  }

  // For other files, add logger at module level
  const loggerImport = getLoggerImport(content)
  if (!loggerImport.hasImport) {
    lines.splice(loggerImport.insertAt, 0, '', `const logger = createLogger('${componentName}')`)
  } else {
    // Add after imports
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('import ') && lines[i].trim() !== '') {
        lines.splice(i, 0, '', `const logger = createLogger('${componentName}')`)
        break
      }
    }
  }

  return lines.join('\n')
}

function replaceConsoleStatements(content) {
  // Replace different console methods with appropriate logger methods
  const replacements = [
    // console.error -> logger.errorWithStack or logger.error
    {
      pattern: /console\.error\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
      replacement: (match, message, errorVar) => {
        if (errorVar.includes('error') || errorVar.includes('Error')) {
          return `logger.errorWithStack('${message}', ${errorVar} as Error)`
        }
        return `logger.error('${message}', { error: ${errorVar} })`
      }
    },

    // console.warn -> logger.warn
    {
      pattern: /console\.warn\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
      replacement: (match, message, data) => `logger.warn('${message}', { data: ${data} })`
    },

    // console.log -> logger.info or logger.debug
    {
      pattern: /console\.log\(['"`]([^'"`]+)['"`],\s*([^)]+)\)/g,
      replacement: (match, message, data) => `logger.info('${message}', { data: ${data} })`
    },

    // Simple console.error with just message
    {
      pattern: /console\.error\(['"`]([^'"`]+)['"`]\)/g,
      replacement: (match, message) => `logger.error('${message}')`
    },

    // Simple console.warn with just message
    {
      pattern: /console\.warn\(['"`]([^'"`]+)['"`]\)/g,
      replacement: (match, message) => `logger.warn('${message}')`
    },

    // Simple console.log with just message
    {
      pattern: /console\.log\(['"`]([^'"`]+)['"`]\)/g,
      replacement: (match, message) => `logger.info('${message}')`
    }
  ]

  let result = content
  for (const { pattern, replacement } of replacements) {
    if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement)
    } else {
      result = result.replace(pattern, replacement)
    }
  }

  return result
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`)

  let content = fs.readFileSync(filePath, 'utf-8')

  // Add logger import if needed
  const loggerImport = getLoggerImport(content)
  if (!loggerImport.hasImport) {
    const lines = content.split('\n')
    lines.splice(loggerImport.insertAt, 0, loggerImport.importLine)
    content = lines.join('\n')
  }

  // Add logger instance
  content = addLoggerInstance(content, filePath)

  // Replace console statements
  const newContent = replaceConsoleStatements(content)

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent)
    console.log(`  ✅ Updated ${filePath}`)
    return true
  }

  return false
}

function main() {
  console.log('🔍 Finding files with console statements...')

  const files = findFilesWithConsole()

  if (files.length === 0) {
    console.log('✅ No console statements found in application code!')
    return
  }

  console.log(`📝 Found ${files.length} files to process:`)
  files.forEach(file => console.log(`  - ${file}`))

  console.log('\n🔧 Processing files...')
  let updatedCount = 0

  for (const file of files) {
    try {
      if (processFile(file)) {
        updatedCount++
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message)
    }
  }

  console.log(`\n✅ Completed! Updated ${updatedCount} files.`)

  // Run ESLint to check for remaining console statements
  console.log('\n🔍 Checking for remaining console statements...')
  try {
    execSync('npm run lint', { stdio: 'inherit' })
  } catch (error) {
    console.log('⚠️  ESLint found issues. Review and fix manually.')
  }
}

if (require.main === module) {
  main()
}