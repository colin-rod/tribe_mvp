'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PrinterIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline'
import type { ParentDigestNarrative } from '@/lib/types/digest'

interface ParentNarrativeViewProps {
  narrative: ParentDigestNarrative
  childName: string
  childPhotoUrl?: string
  dateRange: string
}

export default function ParentNarrativeView({
  narrative,
  childName,
  childPhotoUrl,
  dateRange
}: ParentNarrativeViewProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    window.print()
    setTimeout(() => setIsPrinting(false), 100)
  }

  return (
    <div className="space-y-6">
      {/* Print Controls - Hidden when printing */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Parent Archival Narrative
                </p>
                <p className="text-xs text-neutral-600">
                  Print-ready format for memory books
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} variant="primary" loading={isPrinting}>
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print-Ready Content */}
      <Card className="overflow-hidden print:shadow-none print:border-0">
        <style jsx global>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>

        <CardContent className="p-12 print:p-8">
          {/* Cover Section */}
          <div className="text-center pb-12 mb-12 border-b-4 border-double border-neutral-300 print:page-break">
            {childPhotoUrl && (
              <div className="relative w-48 h-48 mx-auto mb-8 rounded-full overflow-hidden border-4 border-orange-500">
                <Image
                  src={childPhotoUrl}
                  alt={childName}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-neutral-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              {narrative.title}
            </h1>
            <p className="text-xl text-neutral-600 italic" style={{ fontFamily: 'Georgia, serif' }}>
              {dateRange}
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-12">
            <p className="text-lg leading-loose text-neutral-700" style={{ fontFamily: 'Georgia, serif', textAlign: 'justify' }}>
              {narrative.intro}
            </p>
          </div>

          {/* Main Narrative */}
          <div className="mb-12">
            <div className="text-base leading-loose text-neutral-900 whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif', textAlign: 'justify' }}>
              {narrative.narrative}
            </div>
          </div>

          {/* Media Gallery */}
          {narrative.media_references.length > 0 && (
            <div className="mb-12 p-8 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg print:page-break print:bg-white">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                Captured Moments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {narrative.media_references.map((media, index) => (
                  <div
                    key={index}
                    className="p-6 bg-white border border-neutral-200 rounded-lg text-center"
                  >
                    <div className="text-4xl mb-4">
                      {media.type === 'photo' ? '📷' : media.type === 'video' ? '🎬' : '🎵'}
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                      {media.reference_text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closing */}
          <div className="mb-12 p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-l-4 border-orange-500 print:bg-white">
            <p className="text-base leading-loose text-neutral-700 italic" style={{ fontFamily: 'Georgia, serif' }}>
              {narrative.closing}
            </p>
          </div>

          {/* Signature */}
          <div className="text-right pt-8">
            <p className="text-xl text-neutral-900 mb-2" style={{ fontFamily: '"Brush Script MT", cursive' }}>
              With love,
            </p>
            <p className="text-xl text-neutral-900" style={{ fontFamily: '"Brush Script MT", cursive' }}>
              {childName}&apos;s Family ❤️
            </p>
          </div>

          {/* AI Attribution */}
          <div className="mt-12 pt-8 border-t border-neutral-200 print:hidden">
            <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500">
              <SparklesIcon className="w-4 h-4 text-orange-500" />
              <span>This narrative was lovingly crafted by AI to preserve {childName}&apos;s precious moments</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card - Hidden when printing */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Narrative Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-600">Media Items</p>
              <p className="font-semibold text-neutral-900">{narrative.media_references.length}</p>
            </div>
            <div>
              <p className="text-neutral-600">Format</p>
              <p className="font-semibold text-neutral-900">Print-Ready</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
