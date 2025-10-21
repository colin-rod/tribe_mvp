import { spawn } from 'child_process'

export interface FileScanResult {
  clean: boolean
  threat?: string
  engine?: string
}

export interface FileScanner {
  scan(fileName: string, buffer: Buffer, mimeType?: string): Promise<FileScanResult>
}

export class MalwareDetectedError extends Error {
  public readonly fileName: string
  public readonly threat?: string
  public readonly engine?: string

  constructor(fileName: string, threat?: string, engine?: string) {
    super(
      threat
        ? `Malware detected in ${fileName}: ${threat}`
        : `Malware detected in ${fileName}`
    )
    this.name = 'MalwareDetectedError'
    this.fileName = fileName
    this.threat = threat
    this.engine = engine
  }
}

export class MalwareScanFailedError extends Error {
  public readonly fileName: string
  public readonly cause?: Error

  constructor(fileName: string, cause?: unknown) {
    const message = `Malware scanning failed for ${fileName}`
    super(message)
    this.name = 'MalwareScanFailedError'
    this.fileName = fileName
    this.cause = cause instanceof Error ? cause : cause ? new Error(String(cause)) : undefined
  }
}

const EICAR_SIGNATURE =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
const EICAR_SIGNATURE_BUFFER = Buffer.from(EICAR_SIGNATURE, 'ascii')

class SignatureScanner implements FileScanner {
  async scan(fileName: string, buffer: Buffer): Promise<FileScanResult> {
    if (buffer.includes(EICAR_SIGNATURE_BUFFER)) {
      return {
        clean: false,
        threat: 'EICAR-Test-File',
        engine: 'builtin-signature'
      }
    }

    return { clean: true, engine: 'builtin-signature' }
  }
}

function parseCommand(commandString: string): { command: string; args: string[] } | null {
  const trimmed = commandString.trim()
  if (!trimmed) {
    return null
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 0 || !parts[0]) {
    return null
  }

  const [command, ...args] = parts
  return { command, args }
}

class CommandFileScanner implements FileScanner {
  constructor(private readonly command: string, private readonly args: string[]) {}

  async scan(fileName: string, buffer: Buffer): Promise<FileScanResult> {
    return new Promise<FileScanResult>((resolve, reject) => {
      const child = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', chunk => {
        stdout += chunk.toString()
      })

      child.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })

      child.once('error', error => {
        reject(error)
      })

      child.on('close', code => {
        if (code === 0) {
          resolve({ clean: true, engine: this.command })
          return
        }

        if (code === 1) {
          const threat = extractThreatName(stdout || stderr)
          resolve({ clean: false, threat, engine: this.command })
          return
        }

        const error = new Error(
          `Scanner command ${this.command} exited with code ${code}${
            stderr ? `: ${stderr.trim()}` : ''
          }`
        )
        ;(error as Error & { stdout?: string }).stdout = stdout
        ;(error as Error & { stderr?: string }).stderr = stderr
        reject(error)
      })

      if (!child.stdin) {
        reject(new Error(`Scanner command ${this.command} did not expose stdin`))
        return
      }

      child.stdin.on('error', error => {
        reject(error)
      })

      child.stdin.end(buffer)
    })
  }
}

function extractThreatName(output: string): string | undefined {
  if (!output) {
    return undefined
  }

  const lines = output.split(/\r?\n/)
  for (const line of lines) {
    if (!line || !line.toUpperCase().includes('FOUND')) {
      continue
    }

    const withoutFound = line.replace(/FOUND/gi, '').trim()
    if (!withoutFound) {
      continue
    }

    const parts = withoutFound.split(':')
    if (parts.length > 1) {
      const candidate = parts[parts.length - 1].trim()
      if (candidate) {
        return candidate
      }
    }

    return withoutFound.trim() || undefined
  }

  return undefined
}

function createDefaultScanner(): FileScanner {
  const commandConfig = process.env.CLAMAV_SCAN_COMMAND
  if (commandConfig) {
    const parsed = parseCommand(commandConfig)
    if (parsed) {
      return new CommandFileScanner(parsed.command, parsed.args)
    }
  }

  return new SignatureScanner()
}

let activeScanner: FileScanner = createDefaultScanner()

export function setFileScanner(scanner: FileScanner) {
  activeScanner = scanner
}

export function resetFileScanner() {
  activeScanner = createDefaultScanner()
}

export async function assertFileIsClean(params: {
  fileName: string
  buffer: Buffer
  mimeType?: string
}) {
  const { fileName, buffer, mimeType } = params

  try {
    const result = await activeScanner.scan(fileName, buffer, mimeType)

    if (!result.clean) {
      throw new MalwareDetectedError(fileName, result.threat, result.engine)
    }
  } catch (error) {
    if (error instanceof MalwareDetectedError) {
      throw error
    }

    throw new MalwareScanFailedError(fileName, error)
  }
}

