'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY) return
    posthog.init(KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
    })
  }, [])

  return <>{children}</>
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (!KEY) return
  posthog.capture(event, props)
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!KEY) return
  posthog.identify(userId, props)
}

export function reset() {
  if (!KEY) return
  posthog.reset()
}
