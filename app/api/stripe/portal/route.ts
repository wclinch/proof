import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const origin = req.headers.get('origin') ?? 'https://proof-kxfz.onrender.com'

  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  if (!customers.data.length) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}
