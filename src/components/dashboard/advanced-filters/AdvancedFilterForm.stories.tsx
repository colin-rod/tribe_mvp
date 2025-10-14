import { type ComponentProps, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AdvancedFilterForm } from './AdvancedFilterForm'
import type { CustomDateRange } from './types'

const meta: Meta<typeof AdvancedFilterForm> = {
  title: 'Dashboard/Advanced Filters/AdvancedFilterForm',
  component: AdvancedFilterForm,
  args: {
    filters: {},
    customDateRange: { start: '', end: '' } satisfies CustomDateRange,
    hasActiveFilters: true,
    presetName: '',
    filtersLoading: false,
    showHistory: true,
    recentFilters: [
      { filters: { contentType: 'photo' }, description: 'Photos' },
      { filters: { contentType: 'milestone' }, description: 'Milestones' }
    ],
    onSavePreset: () => {},
    onClearHistory: () => {}
  }
}

export default meta

type Story = StoryObj<typeof AdvancedFilterForm>

const InteractiveStory = (args: ComponentProps<typeof AdvancedFilterForm>) => {
  const [filters, setFilters] = useState(args.filters)
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(args.customDateRange)
  const [presetName, setPresetName] = useState(args.presetName)

  return (
    <AdvancedFilterForm
      {...args}
      filters={filters}
      customDateRange={customDateRange}
      onDateRangeChange={(field, value) =>
        setCustomDateRange((current) => ({ ...current, [field]: value }))
      }
      onFiltersChange={setFilters}
      presetName={presetName}
      onPresetNameChange={setPresetName}
    />
  )
}

export const Interactive: Story = {
  render: (args) => <InteractiveStory {...args} />
}
