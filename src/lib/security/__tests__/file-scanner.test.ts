import {
  assertFileIsClean,
  MalwareDetectedError,
  MalwareScanFailedError,
  resetFileScanner,
  setFileScanner,
} from '../file-scanner'
import type { FileScanner } from '../file-scanner'

describe('file-scanner', () => {
  beforeEach(() => {
    resetFileScanner()
  })

  afterEach(() => {
    resetFileScanner()
  })

  it('allows clean buffers to pass', async () => {
    await expect(
      assertFileIsClean({
        fileName: 'clean.txt',
        buffer: Buffer.from('hello world'),
      })
    ).resolves.toBeUndefined()
  })

  it('detects the EICAR signature by default', async () => {
    const eicar =
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

    await expect(
      assertFileIsClean({
        fileName: 'eicar.txt',
        buffer: Buffer.from(eicar, 'ascii'),
      })
    ).rejects.toBeInstanceOf(MalwareDetectedError)
  })

  it('supports injectable scanners for testing infected payloads', async () => {
    const fakeScanner: FileScanner = {
      scan: jest.fn().mockResolvedValue({
        clean: false,
        threat: 'Test.Infection',
        engine: 'test-scanner',
      }),
    }

    setFileScanner(fakeScanner)

    await expect(
      assertFileIsClean({
        fileName: 'infected.png',
        buffer: Buffer.from('pretend virus payload'),
        mimeType: 'image/png',
      })
    ).rejects.toBeInstanceOf(MalwareDetectedError)

    expect(fakeScanner.scan).toHaveBeenCalledWith(
      'infected.png',
      expect.any(Buffer),
      'image/png'
    )
  })

  it('wraps scanner errors in MalwareScanFailedError', async () => {
    const failingScanner: FileScanner = {
      scan: jest.fn().mockRejectedValue(new Error('scanner offline')),
    }

    setFileScanner(failingScanner)

    await expect(
      assertFileIsClean({
        fileName: 'unscannable.png',
        buffer: Buffer.from('data'),
      })
    ).rejects.toBeInstanceOf(MalwareScanFailedError)
  })
})
