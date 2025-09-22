export const mockUpdate = {
  id: 'test-update-1',
  content: 'Test update content for our little one',
  created_at: '2024-01-15T09:00:00Z',
  child_id: 'test-child-1',
  parent_id: 'test-parent-1',
  media_urls: ['https://example.com/test-image.jpg'],
  confirmed_recipients: [{ id: 'test-recipient-1' }, { id: 'test-recipient-2' }],
  children: {
    id: 'test-child-1',
    name: 'Alice',
    birth_date: '2020-01-01',
    profile_photo_url: 'https://example.com/alice.jpg',
  },
}

export const mockResponse = {
  id: 'test-response-1',
  update_id: 'test-update-1',
  recipient_id: 'test-recipient-1',
  channel: 'email' as const,
  content: 'What a wonderful update! Thanks for sharing this precious moment.',
  media_urls: [],
  received_at: '2024-01-15T10:30:00Z',
  recipients: {
    id: 'test-recipient-1',
    name: 'John Doe',
    relationship: 'grandfather',
    email: 'john@example.com',
  },
}

export const mockResponseWithMedia = {
  id: 'test-response-2',
  update_id: 'test-update-1',
  recipient_id: 'test-recipient-2',
  channel: 'sms' as const,
  content: 'So cute! Here are some photos in response 😍',
  media_urls: [
    'https://example.com/response-image1.jpg',
    'https://example.com/response-image2.jpg',
    'https://example.com/response-video.mp4'
  ],
  received_at: '2024-01-15T11:00:00Z',
  recipients: {
    id: 'test-recipient-2',
    name: 'Jane Smith',
    relationship: 'grandmother',
    email: 'jane@example.com',
  },
}

export const mockResponses = [mockResponse, mockResponseWithMedia]

export const mockLongContentResponse = {
  ...mockResponse,
  id: 'test-response-long',
  content: 'This is a very long response content that should trigger the truncation functionality. '.repeat(10),
}

export const mockAnalytics = {
  totalResponses: 15,
  responseRate: 75,
  topResponders: [
    { recipient: 'John Doe', count: 8, relationship: 'grandfather' },
    { recipient: 'Jane Smith', count: 5, relationship: 'grandmother' },
    { recipient: 'Bob Wilson', count: 2, relationship: 'uncle' },
  ],
  responsesByHour: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hour >= 8 && hour <= 22 ? Math.floor(Math.random() * 5) : 0, // More activity during day
  })),
  responsesByChannel: [
    { channel: 'Email', count: 10 },
    { channel: 'SMS', count: 4 },
    { channel: 'WhatsApp', count: 1 },
  ],
  averageResponseTime: 2.5,
  engagementTrend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responses: Math.floor(Math.random() * 10),
  })),
}

export const mockMediaUrls = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/video1.mp4',
  'https://example.com/image3.jpg',
  'https://example.com/image4.jpg',
]

export const mockEmptyResponse = {
  ...mockResponse,
  id: 'test-response-empty',
  content: null,
  media_urls: [],
}

export const mockInvalidChannelResponse = {
  ...mockResponse,
  id: 'test-response-invalid',
  channel: 'invalid-channel' as any,
}

// Helper function to create responses with different properties
export function createMockResponse(overrides: Partial<typeof mockResponse> = {}) {
  return {
    ...mockResponse,
    ...overrides,
    id: overrides.id || `test-response-${Date.now()}`,
  }
}

// Helper function to create many responses for performance testing
export function createManyMockResponses(count: number) {
  return Array.from({ length: count }, (_, i) => createMockResponse({
    id: `test-response-${i}`,
    content: `Response content ${i}`,
    received_at: new Date(Date.now() - i * 1000).toISOString(),
    recipients: {
      id: `recipient-${i}`,
      name: `User ${i}`,
      relationship: 'family',
      email: `user${i}@example.com`,
    },
  }))
}