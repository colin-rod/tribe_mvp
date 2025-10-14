import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ArchiveIcon, DeleteIcon, ExportIcon } from '@/components/icons'

import { BulkActionsPanel } from './BulkActionsPanel'
import type { BulkAction } from './types'

const actions: BulkAction[] = [
  {
    id: 'delete',
    label: 'Delete Selected',
    description: 'Permanently delete selected items',
    icon: DeleteIcon,
    action: async () => Promise.resolve(),
    requiresConfirmation: true,
    color: 'danger'
  },
  {
    id: 'export',
    label: 'Export Selected',
    description: 'Export selected items',
    icon: ExportIcon,
    action: async () => Promise.resolve(),
    color: 'primary'
  },
  {
    id: 'archive',
    label: 'Archive Selected',
    description: 'Archive selected items',
    icon: ArchiveIcon,
    action: async () => Promise.resolve(),
    requiresConfirmation: true,
    color: 'warning'
  }
]

const meta: Meta<typeof BulkActionsPanel> = {
  title: 'Dashboard/Advanced Filters/BulkActionsPanel',
  component: BulkActionsPanel,
  args: {
    actions,
    selectedCount: 3,
    loadingActionId: null,
    onAction: () => {}
  }
}

export default meta

type Story = StoryObj<typeof BulkActionsPanel>

export const Default: Story = {}

export const LoadingState: Story = {
  args: {
    loadingActionId: 'delete'
  }
}
