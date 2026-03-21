import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60 // Per-request max: POST creates prediction, GET downloads+uploads video

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const COST_CREDITS = 2

// POST: deduct credits, create Replicate prediction, return {id} immediately
export async function POST(request: NextRequest) {
  const { imageUrl, motionPrompt, duration } = await request.json()

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Please sign in to generate videos' }, { status: 401 })
  }

  const apiKey = process.env.REPLICATE_API_TOKEN
  if (!apiKey) {
    return NextResponse.json({ error: 'Replicate API key not configured' }, { status: 500 })
  }

  let userId: string
  let currentCredits: number

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    userId = user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    if (!profile || profile.credits < COST_CREDITS) {
      return NextResponse.json(
        { error: `Insufficient credits. Video generation costs ${COST_CREDITS} credits.` },
        { status: 402 }
      )
    }

    currentCredits = profile.credits

    // Optimistic credit deduction
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - COST_CREDITS, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .eq('credits', profile.credits)
      .select()
      .single()

    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: 'Credit check failed, please try again' }, { status: 409 })
    }
  } catch (error: unknown) {
    console.error('[generate-video] Auth error:', error)
    return NextResponse.json({ error: 'Failed to verify credits' }, { status: 500 })
  }

  try {
    const replicateRes = await fetch('https://api.replicate.com/v1/models/wan-video/wan-2.2-i2v-fast/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          prompt: motionPrompt?.trim() || 'Cinematic motion, smooth animation',
          duration: duration === 10 ? 10 : 5,
        },
      }),
    })

    const prediction = await replicateRes.json()
    console.log('[generate-video] Created prediction:', { status: replicateRes.status, id: prediction.id })

    if (!replicateRes.ok) {
      // Refund credits — prediction never started
      await supabase
        .from('profiles')
        .update({ credits: currentCredits, updated_at: new Date().toISOString() })
        .eq('id', userId)
      throw new Error(prediction.detail || prediction.error || 'Failed to create prediction')
    }

    return NextResponse.json({ id: prediction.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[generate-video] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET ?id=: proxy Replicate status; on success upload video to storage; on failure refund credits
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.REPLICATE_API_TOKEN
  if (!apiKey) {
    return NextResponse.json({ error: 'Replicate API key not configured' }, { status: 500 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
  }

  const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { 'Authorization': `Token ${apiKey}` },
  })

  if (!pollRes.ok) {
    return NextResponse.json({ error: `Replicate error: ${pollRes.status}` }, { status: 502 })
  }

  const result = await pollRes.json()
  console.log('[generate-video] Poll status:', result.status, 'id:', id)

  if (result.status === 'succeeded') {
    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No video output from model' }, { status: 500 })
    }

    // Download from Replicate and upload to Supabase Storage
    // Use prediction ID in filename for idempotency (safe to call multiple times)
    const videoRes = await fetch(outputUrl)
    if (!videoRes.ok) {
      return NextResponse.json({ error: `Failed to fetch video: ${videoRes.status}` }, { status: 502 })
    }
    const videoBuffer = await videoRes.arrayBuffer()
    const fileName = `${user.id}/${id}-output.mp4`

    const { error: uploadError } = await supabase.storage
      .from('video-outputs')
      .upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('video-outputs').getPublicUrl(fileName)
    console.log('[generate-video] Uploaded to Supabase Storage:', publicUrl)

    void supabase
      .from('generation_logs')
      .insert({ user_id: user.id, tool: 'image-to-video', created_at: new Date().toISOString() })

    return NextResponse.json({ status: 'succeeded', video: publicUrl })
  }

  if (result.status === 'failed') {
    // Refund credits
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()
      if (profile) {
        await supabase
          .from('profiles')
          .update({ credits: profile.credits + COST_CREDITS, updated_at: new Date().toISOString() })
          .eq('id', user.id)
        console.log(`[generate-video] Refunded ${COST_CREDITS} credits to user ${user.id}`)
      }
    } catch (refundError) {
      console.error('[generate-video] Failed to refund credits:', refundError)
    }
    return NextResponse.json({ status: 'failed', error: result.error || 'Video generation failed' })
  }

  // 'starting' | 'processing' | 'canceled'
  return NextResponse.json({ status: result.status })
}
