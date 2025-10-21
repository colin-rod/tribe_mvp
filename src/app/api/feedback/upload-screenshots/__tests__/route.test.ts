import { NextRequest } from 'next/server'

import { POST } from '../route'
import {
  resetFileScanner,
  setFileScanner,
  MalwareScanFailedError,
} from '@/lib/security/file-scanner'
import type { FileScanner } from '@/lib/security/file-scanner'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

class MemoryFile implements File {
  lastModified: number
  name: string
  size: number
  type: string
  webkitRelativePath = ''
  private buffer: Buffer

  constructor(fileBits: BlobPart[], fileName: string, options: FilePropertyBag = {}) {
    this.name = fileName
    this.type = options.type ?? ''
    this.lastModified = options.lastModified ?? Date.now()

    const buffers = fileBits.map(bit => {
      if (typeof bit === 'string') {
        return Buffer.from(bit)
      }

      if (bit instanceof ArrayBuffer) {
        return Buffer.from(bit)
      }

      if (ArrayBuffer.isView(bit)) {
        return Buffer.from(bit.buffer.slice(bit.byteOffset, bit.byteOffset + bit.byteLength))
      }

      if (bit instanceof Blob) {
        throw new Error('Blob parts are not supported in MemoryFile')
      }

      return Buffer.from([])
    })

    this.buffer = Buffer.concat(buffers)
    this.size = this.buffer.length
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const arrayBuffer = this.buffer.buffer.slice(
      this.buffer.byteOffset,
      this.buffer.byteOffset + this.buffer.byteLength
    )
    return arrayBuffer
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    const slice = this.buffer.slice(start ?? 0, end ?? this.buffer.length)
    return new Blob([slice], { type: contentType ?? this.type })
  }

  stream(): ReadableStream<Uint8Array> {
    const chunk = new Uint8Array(this.buffer)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(chunk)
        controller.close()
      },
    })
  }

  async text(): Promise<string> {
    return this.buffer.toString()
  }

  [Symbol.toStringTag] = 'File'
}

const OriginalFile = (globalThis as any).File as typeof File | undefined

;(globalThis as any).File = MemoryFile as unknown as typeof File

const createFormData = (...files: File[]): FormData => {
  const entries = files.map((file, index) => [
    `screenshot_${index}`,
    file as FormDataEntryValue,
  ] as [string, FormDataEntryValue])

  return {
    entries: function* () {
      for (const entry of entries) {
        yield entry
      }
    },
  } as unknown as FormData
}

type MockLogger = {
  info: jest.Mock
  warn: jest.Mock
  error: jest.Mock
  errorWithStack: jest.Mock
  debug: jest.Mock
}

jest.mock('@/lib/logger', () => {
  const logger: MockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorWithStack: jest.fn(),
    debug: jest.fn(),
  }

  return {
    __esModule: true,
    createLogger: jest.fn(() => logger),
    getMockLogger: () => logger,
  }
})

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('POST /api/feedback/upload-screenshots', () => {
  const uploadMock = jest.fn()
  const getPublicUrlMock = jest.fn()
  const fromMock = jest.fn()
  const mockCookieStore = { get: jest.fn(), set: jest.fn() }
  const { getMockLogger } = jest.requireMock('@/lib/logger') as {
    getMockLogger: () => MockLogger
  }
  const mockLogger = getMockLogger()

  beforeEach(() => {
    jest.clearAllMocks()
    resetFileScanner()

    uploadMock.mockResolvedValue({ data: { path: 'feedback/file.png' }, error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn.example/file.png' } })
    fromMock.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    })

    jest.mocked(createClient).mockReturnValue({
      storage: {
        from: fromMock,
      },
    } as unknown as ReturnType<typeof createClient>)

    ;(cookies as unknown as jest.Mock).mockResolvedValue(mockCookieStore)
  })

  afterEach(() => {
    resetFileScanner()
  })

  afterAll(() => {
    if (OriginalFile) {
      ;(globalThis as any).File = OriginalFile
    } else {
      delete (globalThis as any).File
    }
  })

  const buildRequest = (formData: FormData): NextRequest => {
    return {
      formData: () => Promise.resolve(formData),
    } as unknown as NextRequest
  }

  it('uploads files that pass malware scanning', async () => {
    const scanner: FileScanner = {
      scan: jest.fn().mockResolvedValue({ clean: true, engine: 'test-scanner' }),
    }
    setFileScanner(scanner)

    const file = new File(['safe data'], 'clean.png', { type: 'image/png' })
    const formData = createFormData(file)

    const response = await POST(buildRequest(formData))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true, urls: ['https://cdn.example/file.png'] })

    expect(scanner.scan).toHaveBeenCalledWith('clean.png', expect.any(Buffer), 'image/png')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('feedback-screenshots')
    expect(jest.mocked(createClient)).toHaveBeenCalled()
    expect((cookies as unknown as jest.Mock).mock.calls.length).toBe(1)
  })

  it('rejects infected files and logs the event', async () => {
    const scanner: FileScanner = {
      scan: jest.fn().mockResolvedValue({
        clean: false,
        threat: 'Test.Infection',
        engine: 'test-scanner',
      }),
    }
    setFileScanner(scanner)

    const file = new File(['virus'], 'bad.png', { type: 'image/png' })
    const formData = createFormData(file)

    const response = await POST(buildRequest(formData))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ success: false, error: 'File bad.png failed security scanning' })

    expect(uploadMock).not.toHaveBeenCalled()
    expect(jest.mocked(createClient)).not.toHaveBeenCalled()
    expect((cookies as unknown as jest.Mock).mock.calls.length).toBe(0)
    expect(mockLogger.warn).toHaveBeenCalledWith('Screenshot rejected due to malware detection', {
      fileName: 'bad.png',
      threat: 'Test.Infection',
      scanner: 'test-scanner',
    })
  })

  it('fails the request when the scanner errors', async () => {
    const scanner: FileScanner = {
      scan: jest.fn().mockRejectedValue(new Error('scanner failure')),
    }
    setFileScanner(scanner)

    const file = new File(['data'], 'broken.png', { type: 'image/png' })
    const formData = createFormData(file)

    const response = await POST(buildRequest(formData))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ success: false, error: 'Unable to verify broken.png is safe for upload' })

    expect(uploadMock).not.toHaveBeenCalled()
    expect(jest.mocked(createClient)).not.toHaveBeenCalled()
    expect((cookies as unknown as jest.Mock).mock.calls.length).toBe(0)
    expect(mockLogger.errorWithStack).toHaveBeenCalledWith(
      'Screenshot scan failed',
      expect.any(MalwareScanFailedError),
      { fileName: 'broken.png' }
    )
  })
})
