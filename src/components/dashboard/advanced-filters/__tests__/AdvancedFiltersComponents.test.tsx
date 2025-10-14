import { fireEvent, render, screen } from '@testing-library/react'

import { AdvancedFilterForm } from '../AdvancedFilterForm'
import { BulkActionsPanel } from '../BulkActionsPanel'
import { PresetList } from '../PresetList'
import type { BulkAction, FilterPreset } from '../types'

jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />
}))

const TestIcon = () => <svg data-testid="test-icon" />

describe('BulkActionsPanel', () => {
  const actions: BulkAction[] = [
    {
      id: 'archive',
      label: 'Archive',
      description: 'Archive selected updates',
      icon: TestIcon,
      action: async () => Promise.resolve(),
      requiresConfirmation: false,
      color: 'primary'
    }
  ]

  it('renders actions and handles clicks', () => {
    const onAction = jest.fn()

    render(
      <BulkActionsPanel
        actions={actions}
        selectedCount={2}
        onAction={onAction}
        loadingActionId={null}
      />
    )

    expect(screen.getByText('2 items selected')).toBeInTheDocument()

    const actionButton = screen.getByRole('button', { name: /archive/i })
    fireEvent.click(actionButton)

    expect(onAction).toHaveBeenCalledWith(actions[0])
  })

  it('disables buttons while loading', () => {
    render(
      <BulkActionsPanel
        actions={actions}
        selectedCount={1}
        onAction={jest.fn()}
        loadingActionId="archive"
      />
    )

    expect(screen.getByRole('button', { name: /archive/i })).toBeDisabled()
  })
})

describe('PresetList', () => {
  const presets: FilterPreset[] = [
    {
      id: 'recent',
      name: 'Recent',
      description: 'Recent items',
      filters: { dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-02') } },
      icon: TestIcon,
      isSystem: true
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Custom preset',
      filters: { contentType: 'photo' },
      icon: TestIcon,
      usageCount: 3
    }
  ]

  it('renders presets and triggers handlers', () => {
    const onLoad = jest.fn()
    const onDelete = jest.fn()

    render(
      <PresetList
        presets={presets}
        filters={{ contentType: 'photo' }}
        onLoad={onLoad}
        onDelete={onDelete}
      />
    )

    const [presetButton] = screen.getAllByRole('button', { name: /custom/i })
    fireEvent.click(presetButton)
    expect(onLoad).toHaveBeenCalledWith(presets[1])

    const deleteButton = screen.getByLabelText('Delete preset Custom')
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('custom')
  })
})

describe('AdvancedFilterForm', () => {
  const baseFilters = {}

  it('allows editing filter fields and saving presets', () => {
    const onDateRangeChange = jest.fn()
    const onFiltersChange = jest.fn()
    const onPresetNameChange = jest.fn()
    const onSavePreset = jest.fn()
    const onClearHistory = jest.fn()

    render(
      <AdvancedFilterForm
        filters={baseFilters}
        customDateRange={{ start: '', end: '' }}
        onDateRangeChange={onDateRangeChange}
        onFiltersChange={onFiltersChange}
        hasActiveFilters
        presetName="Initial"
        onPresetNameChange={onPresetNameChange}
        onSavePreset={onSavePreset}
        filtersLoading={false}
        showHistory
        recentFilters={[
          { filters: { contentType: 'photo' }, description: 'Photos' }
        ]}
        onClearHistory={onClearHistory}
      />
    )

    const fromDateInput = screen.getByLabelText('From Date')
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } })
    expect(onDateRangeChange).toHaveBeenCalledWith('start', '2024-01-01')

    const [contentTypeButton] = screen.getAllByText('Photos')
    fireEvent.click(contentTypeButton)
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'photo' }))

    const presetInput = screen.getByPlaceholderText('Enter preset name...')
    fireEvent.change(presetInput, { target: { value: 'My Preset' } })
    expect(onPresetNameChange).toHaveBeenCalledWith('My Preset')

    const saveButton = screen.getByRole('button', { name: /save preset/i })
    fireEvent.click(saveButton)
    expect(onSavePreset).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))
    expect(onClearHistory).toHaveBeenCalled()
  })
})
