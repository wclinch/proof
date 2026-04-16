import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const origin = req.headers.get('origin') ?? 'https://proof-kxfz.onrender.com'

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/account?subscribed=1`,
    cancel_url: `${origin}/account`,
    customer_email: session.user.email,
    metadata: { user_id: session.user.id },
    subscription_data: { metadata: { user_id: session.user.id } },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
