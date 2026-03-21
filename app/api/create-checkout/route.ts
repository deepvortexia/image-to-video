import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
})

// Use service role key to bypass RLS on server-side
// Auth verification is still done via getUser(token) from the Authorization header
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const VALID_PACKS = {
  'Starter':  { priceId: 'price_1T5FPTPRCOojlkAvi1fOqS2M', credits: 10 },
  'Basic':    { priceId: 'price_1T5FRrPRCOojlkAvyCd4ZHjo', credits: 30 },
  'Popular':  { priceId: 'price_1T6F5SPRCOojlkAvW8KQY5jj', credits: 75 },
  'Pro':      { priceId: 'price_1T5FUhPRCOojlkAv3HaP09N6', credits: 200 },
  'Ultimate': { priceId: 'price_1T6F4zPRCOojlkAv7yVpMsLq', credits: 500 },
}

export async function POST(request: NextRequest) {
  const { packName } = await request.json()

  if (!packName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validPack = VALID_PACKS[packName as keyof typeof VALID_PACKS]
  if (!validPack) {
    return NextResponse.json({ error: 'Invalid pack name' }, { status: 400 })
  }

  // Get user from authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Verify the auth token with Supabase
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    // If token expired, the client should refresh - but give a helpful error
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message)
      return NextResponse.json({
        error: 'Authentication expired. Please try again.',
        code: 'TOKEN_EXPIRED',
      }, { status: 401 })
    }

    const origin = request.headers.get('origin') || 'https://video.deepvortexai.com'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: validPack.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
      metadata: {
        packName,
        credits: validPack.credits.toString(),
        userId: user.id,
        app: 'image-to-video',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }, { status: 500 })
  }
}
