import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const origin = req.headers.get('origin') ?? 'https://proof-kxfz.onrender.com'

  const customers = await stripe.customers.list({ email: user.email!, limit: 10 })
  if (!customers.data.length) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  // Find the customer that has an active subscription
  let customerId = customers.data[0].id
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1, status: 'active' })
    if (subs.data.length) { customerId = customer.id; break }
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}
