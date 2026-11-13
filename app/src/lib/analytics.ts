import { Capacitor } from '@capacitor/core'

const CAMPAIGN_PARAMETERS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
])

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

function getAnalyticsLocation(value: string): string {
  const url = new URL(value)
  const campaignParameters = [...url.searchParams].filter(([key]) => CAMPAIGN_PARAMETERS.has(key))
  url.search = ''
  campaignParameters.forEach(([key, parameterValue]) => url.searchParams.append(key, parameterValue))
  url.hash = ''
  return url.href
}

function getAnalyticsReferrer(): string {
  if (!document.referrer) return ''
  const url = new URL(document.referrer)
  return `${url.origin}${url.pathname}`
}

export function initializeAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!import.meta.env.PROD || Capacitor.getPlatform() !== 'web' || !measurementId || !/^G-[A-Z0-9]+$/.test(measurementId)) {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    page_location: getAnalyticsLocation(window.location.href),
    page_referrer: getAnalyticsReferrer(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
}
