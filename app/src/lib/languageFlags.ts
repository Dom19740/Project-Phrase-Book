/** Exact overrides for codes that already carry a region (e.g. "fr-FR") or that don't map to a single country. */
const CODE_OVERRIDES: Record<string, string> = {
  'en-GB': 'GB',
  'en-US': 'US',
  'fr-CA': 'CA',
  'fr-FR': 'FR',
  'pt-BR': 'BR',
  'pt-PT': 'PT',
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  'es-ES': 'ES',
}

/** Bare (no region subtag) language codes mapped to a representative country. */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  af: 'ZA',
  sq: 'AL',
  am: 'ET',
  ar: 'SA',
  hy: 'AM',
  az: 'AZ',
  eu: 'ES',
  bn: 'BD',
  bs: 'BA',
  bg: 'BG',
  my: 'MM',
  ca: 'ES',
  yue: 'HK',
  hr: 'HR',
  cs: 'CZ',
  da: 'DK',
  prs: 'AF',
  nl: 'NL',
  et: 'EE',
  tl: 'PH',
  fi: 'FI',
  ka: 'GE',
  de: 'DE',
  el: 'GR',
  gu: 'IN',
  ht: 'HT',
  ha: 'NG',
  haw: 'US',
  he: 'IL',
  hi: 'IN',
  hu: 'HU',
  is: 'IS',
  ig: 'NG',
  id: 'ID',
  ga: 'IE',
  it: 'IT',
  ja: 'JP',
  kn: 'IN',
  kk: 'KZ',
  km: 'KH',
  ko: 'KR',
  lo: 'LA',
  lv: 'LV',
  lt: 'LT',
  lb: 'LU',
  mk: 'MK',
  ms: 'MY',
  ml: 'IN',
  mt: 'MT',
  mi: 'NZ',
  mr: 'IN',
  mn: 'MN',
  ne: 'NP',
  no: 'NO',
  ps: 'AF',
  fa: 'IR',
  pl: 'PL',
  pa: 'IN',
  ro: 'RO',
  ru: 'RU',
  sm: 'WS',
  gd: 'GB',
  sr: 'RS',
  si: 'LK',
  sk: 'SK',
  sl: 'SI',
  so: 'SO',
  sw: 'KE',
  sv: 'SE',
  ta: 'IN',
  te: 'IN',
  th: 'TH',
  tr: 'TR',
  uk: 'UA',
  ur: 'PK',
  uz: 'UZ',
  vi: 'VN',
  cy: 'GB',
  xh: 'ZA',
  yo: 'NG',
  zu: 'ZA',
  en: 'GB',
  es: 'ES',
  fr: 'FR',
  pt: 'PT',
  zh: 'CN',
}

/** Codes with no sensible single-country flag — shown with a generic globe instead. */
const NO_FLAG_CODES = new Set(['es-419'])

function countryCodeToFlag(countryCode: string): string {
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

const GLOBE = '🌐'

/** Best-effort flag emoji for a language's BCP-47/ISO code, falling back to a globe when there's no sensible match. */
export function getLanguageFlag(code: string): string {
  if (NO_FLAG_CODES.has(code)) return GLOBE

  const override = CODE_OVERRIDES[code]
  if (override) return countryCodeToFlag(override)

  const [base, region] = code.split('-')
  if (region && region.length === 2) return countryCodeToFlag(region)

  const country = LANGUAGE_TO_COUNTRY[base.toLowerCase()]
  if (country) return countryCodeToFlag(country)

  return GLOBE
}
