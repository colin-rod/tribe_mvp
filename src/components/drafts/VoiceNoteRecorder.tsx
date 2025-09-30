'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline'

interface VoiceNoteRecorderProps {
  onRecordingComplete: (transcript: string, audioUrl: string) => void
  disabled?: boolean
}

export default function VoiceNoteRecorder({
  onRecordingComplete,
  disabled = false
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const handleStartRecording = () => {
    // Placeholder: In real implementation, this would:
    // 1. Request microphone permission
    // 2. Start recording audio
    // 3. Start duration timer
    setIsRecording(true)
    // Voice recording started
  }

  const handleStopRecording = () => {
    // Placeholder: In real implementation, this would:
    // 1. Stop recording
    // 2. Upload audio to storage
    // 3. Call transcription service (e.g., OpenAI Whisper)
    // 4. Call onRecordingComplete with transcript and audio URL
    setIsRecording(false)
    setRecordingDuration(0)

    // Mock transcript for demo
    const mockTranscript = 'This is a voice note. [Transcription feature coming soon]'
    const mockAudioUrl = 'https://example.com/audio.mp3'
    onRecordingComplete(mockTranscript, mockAudioUrl)

    // Voice recording stopped
  }

  return (
    <Card className="p-8 text-center" variant="outlined">
      <div className="max-w-md mx-auto">
        {!isRecording ? (
          <>
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MicrophoneIcon className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Ready to Record
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              Tap the button below to start recording your voice note. We'll transcribe it automatically.
            </p>
            <Button
              onClick={handleStartRecording}
              disabled={disabled}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              <MicrophoneIcon className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
            <p className="mt-4 text-xs text-neutral-500">
              Note: Voice transcription feature is coming soon
            </p>
          </>
        ) : (
          <>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-25" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Recording...
            </h3>
            <p className="text-2xl font-mono text-red-600 mb-6">
              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </p>
            <Button
              onClick={handleStopRecording}
              variant="destructive"
              size="lg"
            >
              <StopIcon className="w-5 h-5 mr-2" />
              Stop Recording
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}