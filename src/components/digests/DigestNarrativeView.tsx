'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { SparklesIcon, PhotoIcon, VideoCameraIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import type { DigestNarrative } from '@/lib/types/digest'

interface DigestNarrativeViewProps {
  narrative: DigestNarrative
  recipientName: string
  childName: string
}

export default function DigestNarrativeView({
  narrative,
  recipientName,
  childName
}: DigestNarrativeViewProps) {
  const getMediaIcon = (type: 'photo' | 'video' | 'audio') => {
    switch (type) {
      case 'photo':
        return <PhotoIcon className="w-5 h-5 text-orange-500" />
      case 'video':
        return <VideoCameraIcon className="w-5 h-5 text-orange-500" />
      case 'audio':
        return <MusicalNoteIcon className="w-5 h-5 text-orange-500" />
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-orange-600" />
          <CardTitle>AI-Generated Narrative</CardTitle>
        </div>
        <p className="text-sm text-neutral-600 mt-1">
          Personalized message for {recipientName}
        </p>
      </CardHeader>

      <CardContent className="p-8">
        {/* Intro */}
        <div className="mb-6">
          <p className="text-lg font-semibold text-neutral-900 leading-relaxed">
            {narrative.intro}
          </p>
        </div>

        {/* Main Narrative */}
        <div className="mb-8">
          <div className="text-base text-neutral-700 leading-loose whitespace-pre-wrap prose prose-lg max-w-none">
            {narrative.narrative}
          </div>
        </div>

        {/* Media References */}
        {narrative.media_references.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200">
            <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center">
              <PhotoIcon className="w-5 h-5 mr-2 text-orange-600" />
              Photos & Videos
            </h4>
            <div className="space-y-3">
              {narrative.media_references.map((media, index) => (
                <a
                  key={index}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-neutral-200 hover:border-orange-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                    {getMediaIcon(media.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 group-hover:text-neutral-900 transition-colors">
                      {media.reference_text}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Click to view {media.type}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Closing */}
        <div className="pt-6 border-t border-neutral-200">
          <p className="text-base text-neutral-700 leading-relaxed italic">
            {narrative.closing}
          </p>
        </div>

        {/* AI Attribution */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500">
            <SparklesIcon className="w-4 h-4 text-orange-500" />
            <span>This narrative was thoughtfully crafted by AI from {childName}&apos;s updates</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
