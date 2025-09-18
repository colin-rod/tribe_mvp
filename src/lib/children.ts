import { createClient } from './supabase/client'

export interface Child {
  id: string
  parent_id: string
  name: string
  birth_date: string
  profile_photo_url?: string
  created_at: string
}

export async function createChild(childData: Omit<Child, 'id' | 'parent_id' | 'created_at'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('children')
    .insert({
      parent_id: user.id,
      name: childData.name,
      birth_date: childData.birth_date,
      profile_photo_url: childData.profile_photo_url
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChildren(): Promise<Child[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', user.id)
    .order('birth_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateChild(childId: string, updates: Partial<Omit<Child, 'id' | 'parent_id' | 'created_at'>>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', childId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteChild(childId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // First get the child to check if they have a photo
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('profile_photo_url')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()

  if (fetchError) throw fetchError

  // Delete the child from database
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)
    .eq('parent_id', user.id)

  if (error) throw error

  // Delete the photo from storage if it exists
  if (child.profile_photo_url) {
    const filePath = `${user.id}/children/${childId}/profile.jpg`
    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([filePath])

    // Don't throw storage errors as they shouldn't prevent child deletion
    if (storageError) {
      console.warn('Failed to delete child photo from storage:', storageError)
    }
  }
}

export async function getChildById(childId: string): Promise<Child | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}