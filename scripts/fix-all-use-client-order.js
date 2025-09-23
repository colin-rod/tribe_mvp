#!/usr/bin/env node

/**
 * Find and fix all files with "use client" directive order issues
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function findFilesWithIssue() {
  const command = `find src -name "*.tsx" -exec grep -l "createLogger\\|'use client'" {} \\; | xargs grep -l "createLogger" | xargs grep -l "'use client'"`

  try {
    const output = execSync(command, { encoding: 'utf-8' })
    return output.trim().split('\n').filter(file => file && fs.existsSync(file))
  } catch (error) {
    return []
  }
}

function hasIncorrectOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  let useClientIndex = -1
  let importIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("'use client'")) {
      useClientIndex = i
    }
    if (lines[i].includes("import")) {
      if (importIndex === -1) importIndex = i
    }
  }

  // If use client comes after any import, it's incorrect
  return useClientIndex > importIndex && importIndex !== -1
}

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`)

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  let useClientIndex = -1
  const importsAndLogger = []
  const otherLines = []

  // Collect all lines and categorize them
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes("'use client'")) {
      useClientIndex = i
    } else if (line.includes("import { createLogger }") ||
               line.includes("const logger = createLogger(")) {
      importsAndLogger.push(line)
    } else if (line.startsWith('import ')) {
      otherLines.push(line)
    } else {
      otherLines.push(line)
    }
  }

  if (useClientIndex === -1) {
    console.log(`  ⚠️  No 'use client' found in ${filePath}`)
    return
  }

  // Reconstruct file with correct order
  const newLines = []

  // 1. 'use client' first
  newLines.push("'use client'")
  newLines.push("")

  // 2. Logger import and declaration
  importsAndLogger.forEach(line => {
    if (line.includes("import { createLogger }")) {
      newLines.push(line)
    }
  })

  importsAndLogger.forEach(line => {
    if (line.includes("const logger = createLogger(")) {
      newLines.push("")
      newLines.push(line)
    }
  })

  // 3. All other lines (excluding the ones we already processed)
  let skipEmptyLines = true
  for (const line of otherLines) {
    // Skip 'use client' and logger lines as we already added them
    if (line.includes("'use client'") ||
        line.includes("import { createLogger }") ||
        line.includes("const logger = createLogger(")) {
      continue
    }

    // Skip initial empty lines to avoid double spacing
    if (line.trim() === '' && skipEmptyLines) {
      continue
    } else if (line.trim() !== '') {
      skipEmptyLines = false
    }

    newLines.push(line)
  }

  // Write the fixed content
  fs.writeFileSync(filePath, newLines.join('\n'))
  console.log(`  ✅ Fixed ${filePath}`)
}

function main() {
  console.log('🔍 Finding files with "use client" order issues...')

  const files = findFilesWithIssue()
  const filesToFix = files.filter(hasIncorrectOrder)

  if (filesToFix.length === 0) {
    console.log('✅ No files need fixing!')
    return
  }

  console.log(`🔧 Fixing ${filesToFix.length} files with order issues...`)

  filesToFix.forEach(fixFile)

  console.log('\n✅ All files fixed!')
}

if (require.main === module) {
  main()
}