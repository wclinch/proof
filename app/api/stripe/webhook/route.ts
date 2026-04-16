import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const sub = event.data.object as Stripe.Subscription
  const userId = sub.metadata?.user_id

  if (!userId) return NextResponse.json({ ok: true })

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const active = sub.status === 'active' || sub.status === 'trialing'
    await supabase.from('profiles').upsert({ id: userId, subscribed: active }, { onConflict: 'id' })
  }

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('profiles').upsert({ id: userId, subscribed: false }, { onConflict: 'id' })
  }

  return NextResponse.json({ ok: true })
}
