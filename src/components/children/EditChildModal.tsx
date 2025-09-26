'use client'

import Image from 'next/image'
import { createLogger } from '@/lib/logger'

const logger = createLogger('EditChildModal')
import { useState, useEffect } from 'react'
import { Child, updateChild } from '@/lib/children'
import { uploadChildPhoto, validateImageFile, getChildPhotoUrl, deleteChildPhoto } from '@/lib/photo-upload'
import { validateChildName, validateBirthDate, formatDateForInput } from '@/lib/validation/child'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import DateInput from '@/components/ui/DateInput'

interface EditChildModalProps {
  child: Child
  onChildUpdated: (child: Child) => void
  onClose: () => void
}

export default function EditChildModal({ child, onChildUpdated, onClose }: EditChildModalProps) {
  const [name, setName] = useState(child.name)
  const [birthDate, setBirthDate] = useState(formatDateForInput(child.birth_date))
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    birthDate?: string
    photo?: string
    general?: string
  }>({})

  useEffect(() => {
    if (child.profile_photo_url) {
      setPhotoPreview(getChildPhotoUrl(child.profile_photo_url, child.name))
    }
  }, [child.profile_photo_url])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPhoto(null)
      setPhotoPreview(child.profile_photo_url ? getChildPhotoUrl(child.profile_photo_url, child.name) : null)
      setErrors(prev => ({ ...prev, photo: undefined }))
      setRemovePhoto(false)
      return
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      setErrors(prev => ({ ...prev, photo: validationError }))
      return
    }

    setPhoto(file)
    setRemovePhoto(false)
    setErrors(prev => ({ ...prev, photo: undefined }))

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
    setErrors(prev => ({ ...prev, photo: undefined }))
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
      const updates: Partial<Child> = {
        name: name.trim(),
        birth_date: birthDate
      }

      // Handle photo updates
      if (photo) {
        const photoUrl = await uploadChildPhoto(photo, child.id)
        updates.profile_photo_url = photoUrl
      } else if (removePhoto) {
        // Delete the photo from storage and update database
        try {
          await deleteChildPhoto(child.id)
        } catch (deleteError) {
          logger.warn('Failed to delete photo from storage:', { data: deleteError })
        }
        updates.profile_photo_url = undefined
      }

      const updatedChild = await updateChild(child.id, updates)
      onChildUpdated(updatedChild)
    } catch (error) {
      logger.errorWithStack('Error updating child:', error as Error)
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to update child. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Child</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="p-2 h-8 w-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                Child&apos;s Name *
              </label>
              <Input
                id="edit-name"
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
              <label htmlFor="edit-birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date *
              </label>
              <DateInput
                id="edit-birthDate"
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
              <label htmlFor="edit-photo" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo (Optional)
              </label>
              <div className="space-y-4">
                {photoPreview && !removePhoto && (
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                      <Image
                        src={photoPreview}
                        alt="Current photo"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemovePhoto}
                      disabled={loading}
                    >
                      Remove Photo
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <input
                    id="edit-photo"
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
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Child'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
