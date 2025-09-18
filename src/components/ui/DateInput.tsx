'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarDaysIcon as CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface DateInputProps {
  id?: string
  value: string // YYYY-MM-DD format
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  max?: string // YYYY-MM-DD format for max date
  required?: boolean
}

// Custom input component that looks like the standard Input component
interface CustomInputProps {
  value: string
  onClick: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder, className, disabled, ...props }, ref) => (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        value={value}
        onClick={onClick}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          className
        )}
        disabled={disabled}
        readOnly
      />
      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  )
)
CustomInput.displayName = 'CustomInput'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DateInput({
  id,
  value,
  onChange,
  placeholder = "Select birth date",
  disabled = false,
  className = '',
  max
}: DateInputProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [displayValue, setDisplayValue] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Convert string value to Date object and update display
  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00') // Add time to avoid timezone issues
      setSelectedDate(date)
      setCurrentMonth(date.getMonth())
      setCurrentYear(date.getFullYear())
      setDisplayValue(date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }))
    } else {
      setSelectedDate(null)
      setDisplayValue('')
    }
  }, [value])

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    const formattedDate = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0')
    onChange(formattedDate)
    setIsOpen(false)
  }

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(direction === 'prev' ? currentYear - 1 : currentYear + 1)
  }

  // Get days for the current month view
  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentYear, currentMonth, day))
    }

    return days
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    const maxDate = max ? new Date(max + 'T23:59:59') : today
    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - 18) // 18 years ago

    return date > maxDate || date < minDate
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if we can navigate to previous/next month
  const canNavigatePrev = () => {
    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - 18)
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    return new Date(prevYear, prevMonth, 1) >= new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  }

  const canNavigateNext = () => {
    const today = new Date()
    const maxDate = max ? new Date(max) : today
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    return new Date(nextYear, nextMonth, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  }

  const days = getDaysInMonth()

  return (
    <div ref={containerRef} className="relative date-input-wrapper">
      <CustomInput
        id={id}
        value={displayValue}
        onClick={handleInputClick}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />

      {isOpen && !disabled && (
        <div
          ref={calendarRef}
          className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[320px] max-w-[400px] w-full"
        >
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-4">
            {/* Year navigation */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => navigateYear('prev')}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                disabled={currentYear <= new Date().getFullYear() - 18}
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                {currentYear}
              </span>
              <button
                type="button"
                onClick={() => navigateYear('next')}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                disabled={currentYear >= new Date().getFullYear()}
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Month and navigation */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canNavigatePrev()}
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900 min-w-[5rem] text-center">
                {months[currentMonth]}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canNavigateNext()}
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="h-10" />
              }

              const disabled = isDateDisabled(date)
              const selected = isDateSelected(date)
              const today = isToday(date)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(date)}
                  disabled={disabled}
                  className={cn(
                    'h-10 w-full flex items-center justify-center text-sm rounded-md transition-colors',
                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1',
                    {
                      'bg-primary-600 text-white hover:bg-primary-700': selected,
                      'bg-primary-50 text-primary-700 font-medium': today && !selected,
                      'text-gray-400 cursor-not-allowed hover:bg-transparent': disabled,
                      'text-gray-900': !disabled && !selected && !today,
                    }
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer with helpful text */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Select your child&apos;s birth date (0-18 years)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}