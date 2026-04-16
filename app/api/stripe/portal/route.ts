import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const origin = req.headers.get('origin') ?? 'https://proof-kxfz.onrender.com'

  // Find the Stripe customer by email
  const customers = await stripe.customers.list({ email: session.user.email!, limit: 1 })
  if (!customers.data.length) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}
