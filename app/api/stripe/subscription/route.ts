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

  const customers = await stripe.customers.list({ email: user.email!, limit: 10 })
  if (!customers.data.length) return NextResponse.json({ subscription: null })

  // Search across all customers for this email — multiple customers can exist
  // if the user went through checkout more than once
  let sub: any = null
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 5 })
    const active = subs.data.find(s => s.status === 'active')
    if (active) { sub = active; break }
    if (!sub && subs.data[0]) sub = subs.data[0]
  }
  if (!sub) return NextResponse.json({ subscription: null })

  console.log('[subscription] cancel_at_period_end:', sub.cancel_at_period_end, 'current_period_end:', sub.current_period_end, 'cancel_at:', sub.cancel_at, 'status:', sub.status)

  return NextResponse.json({
    subscription: {
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: sub.current_period_end ?? sub.cancel_at,
    },
  })
}
