/**
 * POST /api/memories/[id]/metadata
 * Update metadata for a single memory
 *
 * PATCH /api/memories/[id]/metadata
 * Update specific metadata category
 *
 * DELETE /api/memories/[id]/metadata
 * Remove metadata category
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const metadataSchema = z.object({
  milestones: z.array(z.string().max(50)).max(10),
  locations: z.array(z.string().max(50)).max(10),
  dates: z.array(z.string()).max(10),
  people: z.array(z.string().max(50)).max(10),
  custom: z.record(z.unknown()).optional(),
})

const updateMetadataSchema = z.object({
  metadata: metadataSchema,
})

const updateCategorySchema = z.object({
  category: z.enum(['milestones', 'locations', 'dates', 'people']),
  values: z.array(z.string().max(50)).max(10),
})

const deleteCategorySchema = z.object({
  category: z.enum(['milestones', 'locations', 'dates', 'people']),
})

/**
 * POST - Update full metadata for a memory
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { metadata } = updateMetadataSchema.parse(body)

    // Update memory metadata
    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('parent_id', user.id)  // Security: ensure user owns this memory
      .select()
      .single()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error updating memory metadata:', updateError)
      return NextResponse.json(
        { error: 'Failed to update metadata', details: updateError.message },
        { status: 500 }
      )
    }

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      memory,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update metadata error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update specific metadata category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { category, values } = updateCategorySchema.parse(body)

    // Get current memory to read existing metadata
    const { data: currentMemory, error: fetchError } = await supabase
      .from('memories')
      .select('metadata')
      .eq('id', memoryId)
      .eq('parent_id', user.id)
      .single()

    if (fetchError || !currentMemory) {
      return NextResponse.json(
        { error: 'Memory not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update specific category
    const updatedMetadata = {
      ...(currentMemory.metadata || {
        milestones: [],
        locations: [],
        dates: [],
        people: [],
        custom: {},
      }),
      [category]: values,
    }

    // Update memory with new metadata
    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('parent_id', user.id)
      .select()
      .single()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error updating metadata category:', updateError)
      return NextResponse.json(
        { error: 'Failed to update metadata category', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      memory,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update metadata category error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove specific metadata category
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { category } = deleteCategorySchema.parse(body)

    // Get current memory to read existing metadata
    const { data: currentMemory, error: fetchError } = await supabase
      .from('memories')
      .select('metadata')
      .eq('id', memoryId)
      .eq('parent_id', user.id)
      .single()

    if (fetchError || !currentMemory) {
      return NextResponse.json(
        { error: 'Memory not found or unauthorized' },
        { status: 404 }
      )
    }

    // Remove specific category
    const updatedMetadata = {
      ...(currentMemory.metadata || {
        milestones: [],
        locations: [],
        dates: [],
        people: [],
        custom: {},
      }),
      [category]: [],
    }

    // Update memory with cleared category
    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('parent_id', user.id)
      .select()
      .single()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error deleting metadata category:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete metadata category', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      memory,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Delete metadata category error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
