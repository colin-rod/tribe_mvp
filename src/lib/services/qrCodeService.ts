/**
 * QR Code Generation Service
 * CRO-242: Generate QR codes for reusable invitation links
 */

import QRCode from 'qrcode'
import { createLogger } from '@/lib/logger'
import type { QRCodeSettings, QRCodeResult } from '@/lib/types/invitation'

const logger = createLogger('QRCodeService')

/**
 * Options for QR code generation (extends base settings)
 */
export interface QRCodeOptions extends QRCodeSettings {
  format?: 'png' | 'svg'
}

/**
 * Service for generating QR codes from URLs
 */
export class QRCodeService {
  /**
   * Generate a QR code as a PNG data URL (base64)
   *
   * @param url - The URL to encode in the QR code
   * @param options - Customization options
   * @returns Promise resolving to QR code result
   */
  async generatePNG(url: string, options: QRCodeOptions = {}): Promise<QRCodeResult> {
    try {
      const {
        size = 512,
        foregroundColor = '#000000',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M',
        margin = 4
      } = options

      logger.info('Generating PNG QR code', { url: url.substring(0, 50), size })

      const dataURL = await QRCode.toDataURL(url, {
        width: size,
        margin,
        errorCorrectionLevel,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })

      return {
        success: true,
        data: dataURL,
        contentType: 'image/png'
      }
    } catch (error) {
      logger.errorWithStack('Error generating PNG QR code', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code'
      }
    }
  }

  /**
   * Generate a QR code as an SVG string
   *
   * @param url - The URL to encode in the QR code
   * @param options - Customization options
   * @returns Promise resolving to QR code result
   */
  async generateSVG(url: string, options: QRCodeOptions = {}): Promise<QRCodeResult> {
    try {
      const {
        size = 512,
        foregroundColor = '#000000',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M',
        margin = 4
      } = options

      logger.info('Generating SVG QR code', { url: url.substring(0, 50), size })

      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin,
        errorCorrectionLevel,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })

      return {
        success: true,
        data: svgString,
        contentType: 'image/svg+xml'
      }
    } catch (error) {
      logger.errorWithStack('Error generating SVG QR code', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code'
      }
    }
  }

  /**
   * Generate a QR code as a Buffer (for server-side file operations)
   *
   * @param url - The URL to encode in the QR code
   * @param options - Customization options
   * @returns Promise resolving to QR code buffer
   */
  async generateBuffer(url: string, options: QRCodeOptions = {}): Promise<Buffer | null> {
    try {
      const {
        size = 512,
        foregroundColor = '#000000',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M',
        margin = 4
      } = options

      logger.info('Generating QR code buffer', { url: url.substring(0, 50), size })

      const buffer = await QRCode.toBuffer(url, {
        width: size,
        margin,
        errorCorrectionLevel,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })

      return buffer
    } catch (error) {
      logger.errorWithStack('Error generating QR code buffer', error as Error)
      return null
    }
  }

  /**
   * Generate a QR code in the requested format
   *
   * @param url - The URL to encode in the QR code
   * @param options - Customization options including format
   * @returns Promise resolving to QR code result
   */
  async generate(url: string, options: QRCodeOptions = {}): Promise<QRCodeResult> {
    const format = options.format || 'png'

    if (format === 'svg') {
      return this.generateSVG(url, options)
    }

    return this.generatePNG(url, options)
  }

  /**
   * Validate a URL for QR code generation
   *
   * @param url - The URL to validate
   * @returns Boolean indicating if URL is valid
   */
  validateURL(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get estimated QR code data size
   * Helps determine appropriate size/error correction level
   *
   * @param url - The URL to encode
   * @returns Character count
   */
  getDataSize(url: string): number {
    return url.length
  }

  /**
   * Recommend error correction level based on use case
   *
   * @param useCase - The intended use case
   * @returns Recommended error correction level
   */
  recommendErrorCorrectionLevel(
    useCase: 'digital' | 'print' | 'outdoor'
  ): 'L' | 'M' | 'Q' | 'H' {
    switch (useCase) {
      case 'digital':
        return 'M' // Medium (15% recovery) - good for screens
      case 'print':
        return 'Q' // Quartile (25% recovery) - better for printed materials
      case 'outdoor':
        return 'H' // High (30% recovery) - best for weathered/damaged codes
      default:
        return 'M'
    }
  }

  /**
   * Get optimal QR code size based on use case
   *
   * @param useCase - The intended use case
   * @returns Recommended pixel size
   */
  recommendSize(useCase: 'thumbnail' | 'display' | 'print'): number {
    switch (useCase) {
      case 'thumbnail':
        return 256 // Small preview
      case 'display':
        return 512 // Standard display size
      case 'print':
        return 1024 // High resolution for printing
      default:
        return 512
    }
  }
}

/**
 * Singleton instance
 */
export const qrCodeService = new QRCodeService()

/**
 * Utility function to quickly generate a QR code data URL
 *
 * @param url - The URL to encode
 * @param size - QR code size in pixels
 * @returns Promise resolving to base64 data URL
 */
export async function quickQRCode(url: string, size: number = 512): Promise<string | null> {
  const result = await qrCodeService.generatePNG(url, { size })
  return result.success ? result.data || null : null
}

/**
 * Utility function to generate a print-ready QR code
 *
 * @param url - The URL to encode
 * @returns Promise resolving to high-res QR code data URL
 */
export async function printQRCode(url: string): Promise<string | null> {
  const result = await qrCodeService.generatePNG(url, {
    size: 1024,
    errorCorrectionLevel: 'Q', // Higher error correction for print
    margin: 6 // Larger margin for print
  })
  return result.success ? result.data || null : null
}
