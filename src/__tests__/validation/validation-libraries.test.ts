import {
  addChildSchema,
  editChildSchema,
  validateChildName,
  validateBirthDate,
  formatDateForInput,
  formatDateFromInput
} from '@/lib/validation/child'

import {
  addRecipientSchema,
  updatePreferencesSchema,
  recipientGroupSchema,
  updateRecipientSchema,
  validateEmail,
  validatePhone,
  validateContactMethod
} from '@/lib/validation/recipients'

describe('Validation Libraries Tests', () => {
  describe('Child Validation', () => {
    describe('addChildSchema', () => {
      it('should validate valid child data', () => {
        const validData = {
          name: 'Emma Johnson',
          birth_date: '2020-01-15'
        }

        const result = addChildSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should validate names with hyphens and apostrophes', () => {
        const validNames = [
          "Mary-Jane Smith",
          "O'Connor",
          "Jean-Pierre",
          "D'Angelo"
        ]

        validNames.forEach(name => {
          const result = addChildSchema.safeParse({
            name,
            birth_date: '2020-01-01'
          })
          expect(result.success).toBe(true)
        })
      })

      it('should reject names with invalid characters', () => {
        const invalidNames = [
          'John123',
          'Emma@Smith',
          'Test_Name',
          'Name$'
        ]

        invalidNames.forEach(name => {
          const result = addChildSchema.safeParse({
            name,
            birth_date: '2020-01-01'
          })
          expect(result.success).toBe(false)
        })
      })

      it('should enforce name length limits', () => {
        const tooLong = 'A'.repeat(101)
        const result = addChildSchema.safeParse({
          name: tooLong,
          birth_date: '2020-01-01'
        })

        expect(result.success).toBe(false)
      })

      it('should validate birth date within 18 years', () => {
        const today = new Date()
        const validDate = new Date(today.getFullYear() - 5, 0, 1)
        const tooOld = new Date(today.getFullYear() - 19, 0, 1)
        const futureDate = new Date(today.getFullYear() + 1, 0, 1)

        const validResult = addChildSchema.safeParse({
          name: 'Valid Child',
          birth_date: validDate.toISOString().split('T')[0]
        })
        expect(validResult.success).toBe(true)

        const tooOldResult = addChildSchema.safeParse({
          name: 'Too Old',
          birth_date: tooOld.toISOString().split('T')[0]
        })
        expect(tooOldResult.success).toBe(false)

        const futureResult = addChildSchema.safeParse({
          name: 'Future Child',
          birth_date: futureDate.toISOString().split('T')[0]
        })
        expect(futureResult.success).toBe(false)
      })

      it('should validate profile photo file size', () => {
        const largeMockFile = new File([''], 'large.jpg', {
          type: 'image/jpeg'
        })
        Object.defineProperty(largeMockFile, 'size', { value: 6 * 1024 * 1024 }) // 6MB

        const result = addChildSchema.safeParse({
          name: 'Test Child',
          birth_date: '2020-01-01',
          profile_photo: largeMockFile
        })

        expect(result.success).toBe(false)
      })

      it('should validate profile photo file type', () => {
        const invalidFile = new File([''], 'doc.pdf', {
          type: 'application/pdf'
        })
        Object.defineProperty(invalidFile, 'size', { value: 1024 })

        const result = addChildSchema.safeParse({
          name: 'Test Child',
          birth_date: '2020-01-01',
          profile_photo: invalidFile
        })

        expect(result.success).toBe(false)
      })
    })

    describe('Child validation helpers', () => {
      it('should validate child names', () => {
        expect(validateChildName('John Doe')).toBeNull()
        expect(validateChildName('')).toBe('Name is required')
        expect(validateChildName('A'.repeat(101))).toBe('Name must be less than 100 characters')
        expect(validateChildName('John123')).toBe('Name can only contain letters, spaces, hyphens, and apostrophes')
      })

      it('should validate birth dates', () => {
        const today = new Date()
        const validDate = new Date(today.getFullYear() - 5, 0, 1)
        const futureDate = new Date(today.getFullYear() + 1, 0, 1)
        const tooOld = new Date(today.getFullYear() - 19, 0, 1)

        expect(validateBirthDate(validDate.toISOString().split('T')[0])).toBeNull()
        expect(validateBirthDate(futureDate.toISOString().split('T')[0])).toBe('Birth date cannot be in the future')
        expect(validateBirthDate(tooOld.toISOString().split('T')[0])).toBe('Child must be under 18 years old')
        expect(validateBirthDate('')).toBe('Birth date is required')
      })

      it('should format dates correctly', () => {
        const dateString = '2020-05-15T12:00:00Z'
        const formatted = formatDateForInput(dateString)
        expect(formatted).toBe('2020-05-15')
      })
    })
  })

  describe('Recipient Validation', () => {
    describe('addRecipientSchema', () => {
      it('should validate complete recipient data', () => {
        const validData = {
          name: 'Grandma Smith',
          email: 'grandma@example.com',
          phone: '+1234567890',
          relationship: 'grandparent' as const,
          frequency: 'weekly_digest' as const,
          preferred_channels: ['email' as const],
          content_types: ['photos' as const, 'text' as const]
        }

        const result = addRecipientSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should require either email or phone', () => {
        const noContact = {
          name: 'Test User',
          relationship: 'friend' as const
        }

        const result = addRecipientSchema.safeParse(noContact)
        expect(result.success).toBe(false)
      })

      it('should validate email-only recipients', () => {
        const emailOnly = {
          name: 'Email User',
          email: 'user@example.com',
          relationship: 'friend' as const,
          preferred_channels: ['email' as const]
        }

        const result = addRecipientSchema.safeParse(emailOnly)
        expect(result.success).toBe(true)
      })

      it('should validate phone-only recipients', () => {
        const phoneOnly = {
          name: 'SMS User',
          phone: '+1234567890',
          relationship: 'family' as const,
          preferred_channels: ['sms' as const]
        }

        const result = addRecipientSchema.safeParse(phoneOnly)
        expect(result.success).toBe(true)
      })

      it('should require phone when SMS channel selected', () => {
        const noPhone = {
          name: 'Test User',
          email: 'test@example.com',
          relationship: 'friend' as const,
          preferred_channels: ['sms' as const]
        }

        const result = addRecipientSchema.safeParse(noPhone)
        expect(result.success).toBe(false)
      })

      it('should require email when email channel selected', () => {
        const noEmail = {
          name: 'Test User',
          phone: '+1234567890',
          relationship: 'friend' as const,
          preferred_channels: ['email' as const]
        }

        const result = addRecipientSchema.safeParse(noEmail)
        expect(result.success).toBe(false)
      })

      it('should validate relationship types', () => {
        const validRelationships = [
          'grandparent', 'parent', 'sibling',
          'friend', 'family', 'colleague', 'other'
        ]

        validRelationships.forEach(relationship => {
          const result = addRecipientSchema.safeParse({
            name: 'Test',
            email: 'test@example.com',
            relationship,
            preferred_channels: ['email']
          })
          expect(result.success).toBe(true)
        })

        const invalidRelationship = addRecipientSchema.safeParse({
          name: 'Test',
          email: 'test@example.com',
          relationship: 'invalid',
          preferred_channels: ['email']
        })
        expect(invalidRelationship.success).toBe(false)
      })

      it('should require at least one channel', () => {
        const noChannels = {
          name: 'Test',
          email: 'test@example.com',
          relationship: 'friend' as const,
          preferred_channels: []
        }

        const result = addRecipientSchema.safeParse(noChannels)
        expect(result.success).toBe(false)
      })

      it('should require at least one content type', () => {
        const noContent = {
          name: 'Test',
          email: 'test@example.com',
          relationship: 'friend' as const,
          preferred_channels: ['email' as const],
          content_types: []
        }

        const result = addRecipientSchema.safeParse(noContent)
        expect(result.success).toBe(false)
      })
    })

    describe('updatePreferencesSchema', () => {
      it('should validate preference updates', () => {
        const validPrefs = {
          frequency: 'daily_digest' as const,
          preferred_channels: ['email' as const, 'sms' as const],
          content_types: ['photos' as const]
        }

        const result = updatePreferencesSchema.safeParse(validPrefs)
        expect(result.success).toBe(true)
      })

      it('should validate frequency options', () => {
        const frequencies = [
          'every_update', 'daily_digest',
          'weekly_digest', 'milestones_only'
        ]

        frequencies.forEach(frequency => {
          const result = updatePreferencesSchema.safeParse({
            frequency,
            preferred_channels: ['email'],
            content_types: ['text']
          })
          expect(result.success).toBe(true)
        })
      })
    })

    describe('recipientGroupSchema', () => {
      it('should validate group data', () => {
        const validGroup = {
          name: 'Family Group',
          default_frequency: 'weekly_digest' as const,
          default_channels: ['email' as const]
        }

        const result = recipientGroupSchema.safeParse(validGroup)
        expect(result.success).toBe(true)
      })

      it('should enforce group name length', () => {
        const tooLong = {
          name: 'A'.repeat(51),
          default_frequency: 'weekly_digest' as const,
          default_channels: ['email' as const]
        }

        const result = recipientGroupSchema.safeParse(tooLong)
        expect(result.success).toBe(false)
      })

      it('should trim group names', () => {
        const withSpaces = {
          name: '  Family  ',
          default_frequency: 'weekly_digest' as const,
          default_channels: ['email' as const]
        }

        const result = recipientGroupSchema.safeParse(withSpaces)
        if (result.success) {
          expect(result.data.name).toBe('Family')
        }
      })
    })

    describe('Validation helpers', () => {
      it('should validate email addresses', () => {
        expect(validateEmail('valid@example.com')).toBeNull()
        expect(validateEmail('user+tag@domain.co.uk')).toBeNull()
        expect(validateEmail('invalid-email')).toBe('Invalid email address')
        expect(validateEmail('@nodomain.com')).toBe('Invalid email address')
        expect(validateEmail('')).toBeNull() // Empty is allowed
      })

      it('should validate phone numbers', () => {
        expect(validatePhone('+1234567890')).toBeNull()
        expect(validatePhone('1234567890')).toBeNull()
        expect(validatePhone('+123')).toBeNull()
        expect(validatePhone('abc123')).toBe('Invalid phone number format')
        expect(validatePhone('+0123456789')).toBe('Invalid phone number format') // Can't start with 0
        expect(validatePhone('')).toBeNull() // Empty is allowed
      })

      it('should validate contact methods', () => {
        expect(validateContactMethod('test@example.com', undefined)).toBeNull()
        expect(validateContactMethod(undefined, '+1234567890')).toBeNull()
        expect(validateContactMethod('test@example.com', '+1234567890')).toBeNull()
        expect(validateContactMethod('', '')).toBe('Either email or phone number is required')
        expect(validateContactMethod(undefined, undefined)).toBe('Either email or phone number is required')
      })
    })
  })

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle international phone numbers', () => {
      const internationalNumbers = [
        '+447911123456', // UK
        '+33612345678',  // France
        '+8613800138000', // China
        '+61412345678'   // Australia
      ]

      internationalNumbers.forEach(phone => {
        expect(validatePhone(phone)).toBeNull()
      })
    })

    it('should handle various email formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBeNull()
      })
    })

    it('should validate multi-channel recipients', () => {
      const multiChannel = {
        name: 'Multi User',
        email: 'user@example.com',
        phone: '+1234567890',
        relationship: 'family' as const,
        preferred_channels: ['email' as const, 'sms' as const, 'whatsapp' as const],
        content_types: ['photos' as const, 'text' as const, 'milestones' as const]
      }

      const result = addRecipientSchema.safeParse(multiChannel)
      expect(result.success).toBe(true)
    })

    it('should handle partial recipient updates', () => {
      const partialUpdate = {
        name: 'Updated Name'
      }

      const result = updateRecipientSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it('should validate channel-content combinations', () => {
      // WhatsApp requires phone
      const whatsappNoPhone = {
        name: 'Test',
        email: 'test@example.com',
        relationship: 'friend' as const,
        preferred_channels: ['whatsapp' as const]
      }

      const result = addRecipientSchema.safeParse(whatsappNoPhone)
      expect(result.success).toBe(false)
    })
  })
})
