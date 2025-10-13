import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { IconOptionSelector } from './IconOptionSelector'
import React, { useState } from 'react'

// Icon components for stories
const BoltIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const meta = {
  title: 'Components/IconOptionSelector',
  component: IconOptionSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A reusable component for selecting options using visual icons/emojis instead of traditional dropdowns or radio buttons. Supports single and multi-select modes with full keyboard navigation and accessibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'radio',
      options: ['single', 'multi'],
      description: 'Selection mode',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the option cards',
    },
    showDescription: {
      control: 'boolean',
      description: 'Whether to show option descriptions',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the selector is disabled',
    },
  },
} satisfies Meta<typeof IconOptionSelector>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper components for stories to use hooks properly
function SingleSelectWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', description: 'Right away', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', description: 'Once per day', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', description: 'Once per week', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      ariaLabel="Notification frequency"
    />
  )
}

function MultiSelectWrapper() {
  const [values, setValues] = useState(['email', 'sms'])
  return (
    <IconOptionSelector
      options={[
        { value: 'email', label: 'Email', description: 'Email notifications', icon: <EmailIcon /> },
        { value: 'sms', label: 'SMS', description: 'Text messages', icon: <PhoneIcon /> },
        { value: 'push', label: 'Push', description: 'Push notifications', icon: <BoltIcon /> },
      ]}
      value={values}
      onChange={(val) => setValues(val as string[])}
      mode="multi"
      ariaLabel="Notification channels"
    />
  )
}

function EmojiSingleSelectWrapper() {
  const [value, setValue] = useState('milestone')
  return (
    <IconOptionSelector
      options={[
        { value: 'milestone', label: 'Milestone', description: 'Important moments', emoji: '⭐' },
        { value: 'birthday', label: 'Birthday', description: 'Birthday celebrations', emoji: '🎂' },
        { value: 'first_steps', label: 'First Steps', description: 'Walking milestone', emoji: '👣' },
        { value: 'first_words', label: 'First Words', description: 'Speaking milestone', emoji: '🗣️' },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      columns={{ mobile: 2, tablet: 2, desktop: 4 }}
      ariaLabel="Milestone type"
    />
  )
}

function EmojiMultiSelectWrapper() {
  const [values, setValues] = useState(['photos', 'text'])
  return (
    <IconOptionSelector
      options={[
        { value: 'photos', label: 'Photos', description: 'Pictures and videos', emoji: '📸' },
        { value: 'text', label: 'Text', description: 'Text updates', emoji: '📝' },
        { value: 'milestones', label: 'Milestones', description: 'Important moments', emoji: '⭐' },
      ]}
      value={values}
      onChange={(val) => setValues(val as string[])}
      mode="multi"
      ariaLabel="Content types"
    />
  )
}

function SmallSizeWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      size="sm"
      showDescription={false}
      ariaLabel="Notification frequency"
    />
  )
}

function LargeSizeWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', description: 'Right away', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', description: 'Once per day', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', description: 'Once per week', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      size="lg"
      ariaLabel="Notification frequency"
    />
  )
}

function WithBadgesWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', description: 'Right away', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', description: 'Once per day', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', description: 'Once per week', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      badges={{
        daily: (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-600 text-white shadow-sm">
            Default
          </span>
        ),
      }}
      ariaLabel="Notification frequency"
    />
  )
}

function DisabledWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', description: 'Right away', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', description: 'Once per day', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', description: 'Once per week', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      disabled
      ariaLabel="Notification frequency"
    />
  )
}

function IndividualDisabledWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', description: 'Right away', icon: <BoltIcon />, disabled: true },
        { value: 'daily', label: 'Daily', description: 'Once per day', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', description: 'Once per week', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      ariaLabel="Notification frequency"
    />
  )
}

function WithoutDescriptionsWrapper() {
  const [value, setValue] = useState('daily')
  return (
    <IconOptionSelector
      options={[
        { value: 'instant', label: 'Instant', icon: <BoltIcon /> },
        { value: 'daily', label: 'Daily', icon: <CalendarIcon /> },
        { value: 'weekly', label: 'Weekly', icon: <CalendarIcon /> },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      showDescription={false}
      ariaLabel="Notification frequency"
    />
  )
}

function CustomGridWrapper() {
  const [value, setValue] = useState('milestone')
  return (
    <IconOptionSelector
      options={[
        { value: 'milestone', label: 'Milestone', emoji: '⭐' },
        { value: 'birthday', label: 'Birthday', emoji: '🎂' },
        { value: 'first_steps', label: 'First Steps', emoji: '👣' },
        { value: 'first_words', label: 'First Words', emoji: '🗣️' },
        { value: 'first_tooth', label: 'First Tooth', emoji: '🦷' },
        { value: 'crawling', label: 'Crawling', emoji: '🐾' },
      ]}
      value={value}
      onChange={(val) => setValue(val as string)}
      mode="single"
      columns={{ mobile: 2, tablet: 3, desktop: 6 }}
      showDescription={false}
      ariaLabel="Milestone type"
    />
  )
}

// Stories
export const SingleSelectWithIcons = () => <SingleSelectWrapper />
SingleSelectWithIcons.storyName = 'Single Select with Icons'

export const MultiSelectWithIcons = () => <MultiSelectWrapper />
MultiSelectWithIcons.storyName = 'Multi Select with Icons'

export const SingleSelectWithEmojis = () => <EmojiSingleSelectWrapper />
SingleSelectWithEmojis.storyName = 'Single Select with Emojis'

export const MultiSelectWithEmojis = () => <EmojiMultiSelectWrapper />
MultiSelectWithEmojis.storyName = 'Multi Select with Emojis'

export const SmallSize = () => <SmallSizeWrapper />
SmallSize.storyName = 'Small Size'

export const LargeSize = () => <LargeSizeWrapper />
LargeSize.storyName = 'Large Size'

export const WithBadges = () => <WithBadgesWrapper />
WithBadges.storyName = 'With Badges'

export const Disabled = () => <DisabledWrapper />
Disabled.storyName = 'Disabled'

export const IndividualDisabledOptions = () => <IndividualDisabledWrapper />
IndividualDisabledOptions.storyName = 'Individual Disabled Options'

export const WithoutDescriptions = () => <WithoutDescriptionsWrapper />
WithoutDescriptions.storyName = 'Without Descriptions'

export const CustomGridLayout = () => <CustomGridWrapper />
CustomGridLayout.storyName = 'Custom Grid Layout'
