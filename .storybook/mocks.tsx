/**
 * Mock providers and utilities for Storybook stories
 * Provides mock implementations for authentication, Supabase, and other dependencies
 */

import React from 'react'

// Mock AuthProvider for stories that need authentication context
export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  )
}

// Mock user data for stories
export const mockUsers = {
  parent: {
    id: 'user-1',
    email: 'parent@example.com',
    full_name: 'Sarah Johnson',
    created_at: '2024-01-01T00:00:00Z',
  },
  grandparent: {
    id: 'user-2',
    email: 'grandma@example.com',
    full_name: 'Mary Johnson',
    created_at: '2024-01-01T00:00:00Z',
  },
}

// Mock children data
export const mockChildren = [
  {
    id: 'child-1',
    parent_id: 'user-1',
    name: 'Emma Johnson',
    birth_date: '2023-12-25',
    profile_photo_url: undefined,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'child-2',
    parent_id: 'user-1',
    name: 'Oliver Johnson',
    birth_date: '2022-06-15',
    profile_photo_url: undefined,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'child-3',
    parent_id: 'user-1',
    name: 'Sophia Johnson',
    birth_date: '2024-03-01',
    profile_photo_url: undefined,
    created_at: '2024-01-15T10:00:00Z',
  },
]

// Mock recipients data
export const mockRecipients = [
  {
    id: 'recipient-1',
    parent_id: 'user-1',
    name: 'Grandma Mary',
    relationship: 'grandmother',
    email: 'grandma@example.com',
    phone: '+1-555-0123',
    delivery_preferences: {
      email: true,
      sms: false,
    },
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'recipient-2',
    parent_id: 'user-1',
    name: 'Uncle Tom',
    relationship: 'uncle',
    email: 'tom@example.com',
    phone: '+1-555-0124',
    delivery_preferences: {
      email: true,
      sms: true,
    },
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'recipient-3',
    parent_id: 'user-1',
    name: 'Aunt Lisa',
    relationship: 'aunt',
    email: 'lisa@example.com',
    phone: '+1-555-0125',
    delivery_preferences: {
      email: true,
      sms: false,
    },
    created_at: '2024-01-15T10:00:00Z',
  },
]

// Mock update data
export const mockUpdates = [
  {
    id: 'update-1',
    content: 'Emma took her first independent steps today! She was so excited and kept walking back and forth between the couch and coffee table. We managed to capture it on video and she seemed so proud of herself. 🚶‍♀️',
    contentPreview: 'Emma took her first independent steps today! She was so excited and kept walking back and forth...',
    child: {
      id: 'child-1',
      name: 'Emma',
      age: '11 months',
      avatar: undefined,
    },
    createdAt: new Date('2024-12-25T14:30:00Z'),
    timeAgo: '2 hours ago',
    responseCount: 5,
    hasUnreadResponses: true,
    lastResponseAt: new Date('2024-12-25T15:45:00Z'),
    distributionStatus: 'sent' as const,
  },
  {
    id: 'update-2',
    content: 'Oliver said his first full sentence today: "I want more cookies please!" We were so proud of his manners and how clearly he spoke. He\'s growing up so fast! 🍪',
    contentPreview: 'Oliver said his first full sentence today: "I want more cookies please!" We were so proud...',
    child: {
      id: 'child-2',
      name: 'Oliver',
      age: '2 years',
      avatar: undefined,
    },
    createdAt: new Date('2024-12-25T09:15:00Z'),
    timeAgo: '7 hours ago',
    responseCount: 8,
    hasUnreadResponses: false,
    lastResponseAt: new Date('2024-12-25T12:30:00Z'),
    distributionStatus: 'sent' as const,
  },
  {
    id: 'update-3',
    content: 'Sophia slept through the night for the first time! 8 hours straight from 10 PM to 6 AM. We finally got some rest and she woke up so happy and refreshed. 😴✨',
    contentPreview: 'Sophia slept through the night for the first time! 8 hours straight from 10 PM to 6 AM...',
    child: {
      id: 'child-3',
      name: 'Sophia',
      age: '3 months',
      avatar: undefined,
    },
    createdAt: new Date('2024-12-24T18:00:00Z'),
    timeAgo: '1 day ago',
    responseCount: 12,
    hasUnreadResponses: true,
    lastResponseAt: new Date('2024-12-25T08:15:00Z'),
    distributionStatus: 'sent' as const,
  },
]

// Mock responses data
export const mockResponses = [
  {
    id: 'response-1',
    update_id: 'update-1',
    recipient_id: 'recipient-1',
    channel: 'email',
    content: 'Oh my goodness! I can\'t believe Emma is walking already! This made my whole day. Thank you for sharing this precious moment with me. Give her a big hug from Grandma! 💕',
    media_urls: [],
    received_at: '2024-12-25T15:45:00Z',
    recipients: {
      id: 'recipient-1',
      name: 'Grandma Mary',
      relationship: 'grandmother',
      email: 'grandma@example.com',
    },
  },
  {
    id: 'response-2',
    update_id: 'update-1',
    recipient_id: 'recipient-2',
    channel: 'email',
    content: 'Way to go, Emma! Can\'t wait to see her take more steps when I visit next week. Such an exciting milestone! 👏',
    media_urls: [],
    received_at: '2024-12-25T16:20:00Z',
    recipients: {
      id: 'recipient-2',
      name: 'Uncle Tom',
      relationship: 'uncle',
      email: 'tom@example.com',
    },
  },
]

// Mock performance monitoring data
export const mockPerformanceMetrics = {
  LCP: { value: 1200, rating: 'good' as const },
  INP: { value: 150, rating: 'good' as const },
  CLS: { value: 0.05, rating: 'good' as const },
  FCP: { value: 800, rating: 'good' as const },
  TTFB: { value: 200, rating: 'good' as const },
}

// Mock environment variables
export const mockEnv = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
}

// Story decorator to provide common mock context
export const withMockProviders = (Story: React.ComponentType) => {
  return (
    <MockAuthProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        <Story />
      </div>
    </MockAuthProvider>
  )
}

// Helper to generate mock data with variations
export const generateMockChild = (overrides = {}) => ({
  id: `child-${Math.random().toString(36).substr(2, 9)}`,
  parent_id: 'user-1',
  name: 'Sample Child',
  birth_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  profile_photo_url: undefined,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const generateMockUpdate = (overrides = {}) => ({
  id: `update-${Math.random().toString(36).substr(2, 9)}`,
  content: 'Sample update content describing a milestone or daily activity.',
  contentPreview: 'Sample update content describing a milestone...',
  child: {
    id: 'child-1',
    name: 'Sample Child',
    age: '1 year',
    avatar: undefined,
  },
  createdAt: new Date(),
  timeAgo: '1 hour ago',
  responseCount: 3,
  hasUnreadResponses: false,
  distributionStatus: 'sent' as const,
  ...overrides,
})

export default {
  MockAuthProvider,
  mockUsers,
  mockChildren,
  mockRecipients,
  mockUpdates,
  mockResponses,
  mockPerformanceMetrics,
  mockEnv,
  withMockProviders,
  generateMockChild,
  generateMockUpdate,
}