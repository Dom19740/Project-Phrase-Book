interface Props {
  size?: number
  className?: string
}

/** The app's brand mark — an inline SVG so it can inherit color via `currentColor` and scale crisply. */
export function Logo({ size = 20, className = '' }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={(size * 110) / 100} viewBox="0 0 100 110" className={className}>
      <path d="M4 4 H96 V84 H28 L4 108 Z" fill="currentColor" />
      <path d="M28 26 H46 V58 H38 V72 H28 Z" fill="var(--logo-cutout, #FFFFFF)" />
      <path d="M54 26 H72 V58 H64 V72 H54 Z" fill="var(--logo-cutout, #FFFFFF)" />
    </svg>
  )
}

interface WordmarkProps {
  size?: number
  className?: string
  oneLine?: boolean
}

/** The Archivo wordmark that pairs with the mark — two lines by default, one line only for short headers. */
export function Wordmark({ size, className = '', oneLine = false }: WordmarkProps) {
  const style = size ? { fontSize: size } : undefined

  if (oneLine) {
    return (
      <span className={`font-brand font-bold uppercase tracking-[0.14em] ${className}`} style={style}>
        Travel Chatter
      </span>
    )
  }

  return (
    <span className={`font-brand font-bold uppercase leading-[1.05] tracking-[0.14em] ${className}`} style={style}>
      <span className="block">Travel</span>
      <span className="block">Chatter</span>
    </span>
  )
}
