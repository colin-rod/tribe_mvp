import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { within, userEvent } from '@storybook/testing-library'
import { rest } from 'msw'
import { vi } from 'vitest'
import AddRecipientForm from './AddRecipientForm'
import type { Recipient } from '@/lib/recipients'

const buildRecipient = (overrides: Partial<Recipient> = {}): Recipient => ({
  id: overrides.id ?? 'rec-1',
  parent_id: overrides.parent_id ?? 'parent-1',
  name: overrides.name ?? 'Grandma',
  email: overrides.email ?? 'grandma@example.com',
  phone: overrides.phone ?? null,
  relationship: overrides.relationship ?? 'other',
  group_id: overrides.group_id ?? null,
  frequency: overrides.frequency ?? 'weekly_digest',
  preferred_channels: overrides.preferred_channels ?? ['email'],
  content_types: overrides.content_types ?? ['photos', 'text'],
  importance_threshold: overrides.importance_threshold ?? 'all_updates',
  overrides_group_default: overrides.overrides_group_default ?? false,
  preference_token: overrides.preference_token ?? 'token-123',
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at ?? new Date().toISOString(),
  group: overrides.group
})

vi.mock('@/lib/recipients', async () => {
  const actual = await vi.importActual<typeof import('@/lib/recipients')>('@/lib/recipients')
  return {
    ...actual,
    createRecipient: vi.fn(async ({ name, email, phone }) => buildRecipient({
      id: `rec-${Math.random().toString(16).slice(2)}`,
      name,
      email: email ?? null,
      phone: phone ?? null
    })),
    updateRecipient: vi.fn(async (id: string, updates: Partial<Recipient>) => buildRecipient({
      id,
      ...updates
    }))
  }
})

const meta: Meta<typeof AddRecipientForm> = {
  title: 'Recipients/AddRecipientForm',
  component: AddRecipientForm,
  parameters: {
    layout: 'centered'
  },
  args: {
    onRecipientAdded: () => {},
    onCancel: () => {}
  }
}

export default meta

type Story = StoryObj<typeof AddRecipientForm>

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post('/api/recipients/check-duplicate', (_req, res, ctx) => res(ctx.json({ match: null })))
      ]
    }
  }
}

export const DuplicateWarning: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post('/api/recipients/check-duplicate', async (_req, res, ctx) => res(ctx.json({
          match: {
            id: 'rec-existing',
            name: 'Grandma Existing',
            email: 'grandma@example.com',
            phone: '+15555550123',
            source: 'email'
          }
        })))
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const emailInput = await canvas.findByLabelText('Email Address')
    await userEvent.type(emailInput, 'grandma@example.com')
    emailInput.blur()
  }
}

export const MergeFlow: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post('/api/recipients/check-duplicate', async (_req, res, ctx) => res(ctx.json({
          match: {
            id: 'rec-existing',
            name: 'Grandma Existing',
            email: 'grandma@example.com',
            phone: '+15555550123',
            source: 'email'
          }
        })))
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const emailInput = await canvas.findByLabelText('Email Address')
    await userEvent.type(emailInput, 'grandma@example.com')
    emailInput.blur()
    const mergeButton = await canvas.findByRole('button', { name: /merge details/i })
    await userEvent.click(mergeButton)
  }
}

export const OverridePath: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post('/api/recipients/check-duplicate', async (_req, res, ctx) => res(ctx.json({
          match: {
            id: 'rec-existing',
            name: 'Grandma Existing',
            email: 'grandma@example.com',
            phone: '+15555550123',
            source: 'email'
          }
        })))
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const emailInput = await canvas.findByLabelText('Email Address')
    await userEvent.type(emailInput, 'duplicate@example.com')
    emailInput.blur()
    const overrideButton = await canvas.findByRole('button', { name: /create new anyway/i })
    await userEvent.click(overrideButton)
  }
}
