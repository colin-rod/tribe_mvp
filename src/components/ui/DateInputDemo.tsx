'use client'

import { useState } from 'react'
import DateInput from './DateInput'

export default function DateInputDemo() {
  const [birthDate, setBirthDate] = useState('')

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        New DateInput Component Demo
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="birth-date" className="block text-sm font-medium text-gray-700 mb-2">
            Child&apos;s Birth Date
          </label>
          <DateInput
            id="birth-date"
            value={birthDate}
            onChange={setBirthDate}
            placeholder="Select birth date"
          />
        </div>

        {birthDate && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Selected date: <span className="font-medium text-gray-900">{birthDate}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}