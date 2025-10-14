import type { Meta, StoryObj } from '@storybook/react'

import { CalendarIcon } from '@/components/icons'

import { PresetList } from './PresetList'
import type { FilterPreset } from './types'

const presets: FilterPreset[] = [
  {
    id: 'recent',
    name: 'Recent Updates',
    description: 'Updates from the last 7 days',
    filters: {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    },
    icon: CalendarIcon,
    isSystem: true
  },
  {
    id: 'milestones',
    name: 'Milestones',
    description: 'Milestone updates',
    filters: { contentType: 'milestone' },
    icon: CalendarIcon,
    usageCount: 12
  }
]

const meta: Meta<typeof PresetList> = {
  title: 'Dashboard/Advanced Filters/PresetList',
  component: PresetList,
  args: {
    presets,
    filters: {},
    onLoad: () => {},
    onDelete: () => {}
  }
}

export default meta

type Story = StoryObj<typeof PresetList>

export const Default: Story = {}

export const ActivePreset: Story = {
  args: {
    filters: presets[1].filters
  }
}
