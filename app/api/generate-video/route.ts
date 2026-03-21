import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 minutes for video generation

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const COST_CREDITS = 2

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

  let generationFailed = false

  try {
    // Call Replicate minimax/hailuo-02-fast
    const replicateRes = await fetch('https://api.replicate.com/v1/models/minimax/hailuo-02-fast/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          first_frame_image: imageUrl,
          prompt: motionPrompt?.trim() || 'Cinematic motion, smooth animation',
          duration: duration === 10 ? 10 : 6,
        },
      }),
    })

    const prediction = await replicateRes.json()
    console.log('[generate-video] Replicate response:', { status: replicateRes.status, predictionId: prediction.id })

    if (!replicateRes.ok) {
      generationFailed = true
      throw new Error(prediction.detail || prediction.error || 'Failed to create prediction')
    }

    // Poll every 3 seconds
    let result = prediction
    const pollStartTime = Date.now()
    const TIMEOUT_MS = 270_000 // 4.5 min

    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 3000))

      if (Date.now() - pollStartTime > TIMEOUT_MS) {
        generationFailed = true
        throw new Error('Video generation timed out')
      }

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      })

      if (!pollRes.ok) {
        generationFailed = true
        throw new Error(`Failed to poll prediction: ${pollRes.status}`)
      }

      result = await pollRes.json()
      console.log('[generate-video] Poll status:', result.status)
    }

    if (result.status === 'failed') {
      generationFailed = true
      throw new Error(result.error || 'Video generation failed')
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      generationFailed = true
      throw new Error('No video returned from model')
    }

    // Download video and upload to Supabase Storage
    const videoRes = await fetch(outputUrl)
    if (!videoRes.ok) throw new Error(`Failed to fetch Replicate output: ${videoRes.status}`)
    const videoBuffer = await videoRes.arrayBuffer()

    const fileName = `${userId}/${Date.now()}-output.mp4`
    const { error: uploadError } = await supabase.storage
      .from('video-outputs')
      .upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: false })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage.from('video-outputs').getPublicUrl(fileName)
    if (!publicUrl) throw new Error('Failed to get public URL after upload')

    console.log('[generate-video] Uploaded to Supabase Storage:', publicUrl)

    // Log generation (fire-and-forget)
    void supabase
      .from('generation_logs')
      .insert({ user_id: userId, tool: 'image-to-video', created_at: new Date().toISOString() })

    return NextResponse.json({ video: publicUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[generate-video] Error:', message)
    console.error('[generate-video] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))

    if (generationFailed) {
      try {
        await supabase
          .from('profiles')
          .update({ credits: currentCredits, updated_at: new Date().toISOString() })
          .eq('id', userId)
        console.log(`[generate-video] Refunded ${COST_CREDITS} credits to user ${userId}`)
      } catch (refundError) {
        console.error('[generate-video] Failed to refund credits:', refundError)
      }
    }

    return NextResponse.json({ error: message || 'Failed to generate video' }, { status: 500 })
  }
}
