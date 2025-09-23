'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('AddChildForm')
import { useState } from 'react'
import { Child, createChild, updateChild } from '@/lib/children'
import { uploadChildPhoto, validateImageFile } from '@/lib/photo-upload'
import { validateChildName, validateBirthDate } from '@/lib/validation/child'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import DateInput from '@/components/ui/DateInput'

interface AddChildFormProps {
  onChildAdded: (child: Child) => void
  onCancel: () => void
}

export default function AddChildForm({ onChildAdded, onCancel }: AddChildFormProps) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    birthDate?: string
    photo?: string
    general?: string
  }>({})

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPhoto(null)
      setPhotoPreview(null)
      setErrors(prev => ({ ...prev, photo: undefined }))
      return
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      setErrors(prev => ({ ...prev, photo: validationError }))
      return
    }

    setPhoto(file)
    setErrors(prev => ({ ...prev, photo: undefined }))

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}

    const nameError = validateChildName(name)
    if (nameError) newErrors.name = nameError

    const birthDateError = validateBirthDate(birthDate)
    if (birthDateError) newErrors.birthDate = birthDateError

    if (photo) {
      const photoError = validateImageFile(photo)
      if (photoError) newErrors.photo = photoError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      // Create child first
      const childData = {
        name: name.trim(),
        birth_date: birthDate,
        profile_photo_url: undefined as string | undefined
      }

      let newChild = await createChild(childData)

      // Upload photo if provided and update the child with the photo URL
      if (photo) {
        const photoUrl = await uploadChildPhoto(photo, newChild.id)
        // Update the child in the database with the photo URL
        newChild = await updateChild(newChild.id, { profile_photo_url: photoUrl })
      }

      onChildAdded(newChild)
    } catch (error) {
      logger.errorWithStack('Error adding child:', error as Error)
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to add child. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Child</h2>
      </div>

      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Child&apos;s Name *
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter child's name"
          disabled={loading}
          className={errors.name ? 'border-red-300' : ''}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
          Birth Date *
        </label>
        <DateInput
          id="birthDate"
          value={birthDate}
          onChange={setBirthDate}
          placeholder="Select birth date"
          disabled={loading}
          className={errors.birthDate ? 'border-red-300' : ''}
          max={new Date().toISOString().split('T')[0]}
          required
        />
        {errors.birthDate && (
          <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
        )}
      </div>

      <div>
        <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
          Profile Photo (Optional)
        </label>
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="relative">
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`flex items-center justify-center px-6 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                errors.photo
                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <span className="relative font-medium text-primary-600 hover:text-primary-500">
                      Choose a photo
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>
            </div>
            {errors.photo && (
              <p className="mt-2 text-sm text-red-600">{errors.photo}</p>
            )}
          </div>
          {photoPreview && (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Adding Child...
            </>
          ) : (
            'Add Child'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}