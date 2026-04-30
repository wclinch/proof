import { getSupabaseBrowser } from './supabase-browser'
import type { Project } from './types'

export async function loadProjectsCloud(userId: string): Promise<Project[] | null> {
  const sb = getSupabaseBrowser()
  const { data } = await (sb.from as any)('user_data')
    .select('projects')
    .eq('user_id', userId)
    .single() as { data: { projects: Project[] } | null }
  return data?.projects ?? null
}

export async function saveProjectsCloud(userId: string, projects: Project[]): Promise<void> {
  const sb = getSupabaseBrowser()
  await (sb.from as any)('user_data')
    .upsert(
      { user_id: userId, projects, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
}
