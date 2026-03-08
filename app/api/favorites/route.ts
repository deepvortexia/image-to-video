import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TOOL_TYPE = 'image-to-video'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function getUser(authHeader: string | null) {
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ).auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(request: NextRequest) {
  const user = await getUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('favorites')
    .select('id, result_url, created_at')
    .eq('user_id', user.id)
    .eq('tool_type', TOOL_TYPE)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[favorites] Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }

  return NextResponse.json({ favorites: data || [] })
}

export async function POST(request: NextRequest) {
  const user = await getUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { result_url } = await request.json()
  if (!result_url) return NextResponse.json({ error: 'result_url is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('favorites')
    .insert({ user_id: user.id, tool_type: TOOL_TYPE, result_url })
    .select('id')
    .single()

  if (error) {
    console.error('[favorites] Insert error:', error)
    return NextResponse.json({ error: 'Failed to save favorite' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('favorites')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('tool_type', TOOL_TYPE)

  if (error) {
    console.error('[favorites] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
