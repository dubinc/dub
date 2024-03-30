'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    // api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST as string,
    capture_pageview: false
  })
}

export function PostHogProvider({ children }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
