#!/usr/bin/env node

/**
 * Fix "use client" directive order for files that have logger imports
 */

const fs = require('fs')
const path = require('path')

// Files that need fixing based on the build error
const FILES_TO_FIX = [
  'src/components/children/ChildManager.tsx',
  'src/components/children/ChildSelector.tsx',
  'src/components/groups/AddGroupForm.tsx',
  'src/components/groups/GroupEditor.tsx',
  'src/components/groups/GroupManager.tsx'
]

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`)

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  let loggerImportIndex = -1
  let loggerDeclarationIndex = -1
  let useClientIndex = -1

  // Find relevant lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import { createLogger }")) {
      loggerImportIndex = i
    } else if (lines[i].includes("const logger = createLogger(")) {
      loggerDeclarationIndex = i
    } else if (lines[i].includes("'use client'")) {
      useClientIndex = i
    }
  }

  if (useClientIndex === -1 || loggerImportIndex === -1) {
    console.log(`  ⚠️  Skipping ${filePath} - missing expected patterns`)
    return
  }

  // If use client is already first, skip
  if (useClientIndex === 0) {
    console.log(`  ✅ ${filePath} already correct`)
    return
  }

  // Reconstruct the file with correct order
  const newLines = []

  // 1. Add 'use client' first
  newLines.push("'use client'")
  newLines.push("")

  // 2. Add the logger import
  newLines.push(lines[loggerImportIndex])

  // 3. Add logger declaration if it exists
  if (loggerDeclarationIndex !== -1) {
    newLines.push("")
    newLines.push(lines[loggerDeclarationIndex])
  }

  // 4. Add all other lines except the ones we already added
  for (let i = 0; i < lines.length; i++) {
    if (i === loggerImportIndex ||
        i === loggerDeclarationIndex ||
        i === useClientIndex ||
        (lines[i].trim() === '' && (i === loggerImportIndex + 1 || i === loggerDeclarationIndex + 1))) {
      continue
    }
    newLines.push(lines[i])
  }

  // Write the fixed content
  fs.writeFileSync(filePath, newLines.join('\n'))
  console.log(`  ✅ Fixed ${filePath}`)
}

function main() {
  console.log('🔧 Fixing "use client" directive order...')

  for (const file of FILES_TO_FIX) {
    const fullPath = path.join(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      fixFile(fullPath)
    } else {
      console.log(`  ⚠️  File not found: ${file}`)
    }
  }

  console.log('\n✅ All files fixed!')
}

if (require.main === module) {
  main()
}