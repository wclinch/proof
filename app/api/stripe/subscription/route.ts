import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  if (!customers.data.length) return NextResponse.json({ subscription: null })

  // Fetch all subscriptions (active + cancelled-at-period-end) sorted by recency
  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    limit: 5,
  })

  // Prefer active, fall back to most recent cancelled
  const sub = (subscriptions.data.find(s => s.status === 'active') ?? subscriptions.data[0]) as any
  if (!sub) return NextResponse.json({ subscription: null })
  return NextResponse.json({
    subscription: {
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: sub.current_period_end, // Unix timestamp (seconds)
    },
  })
}
