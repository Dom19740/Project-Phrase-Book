import type { CSSProperties } from 'react'

interface Props {
  size?: number
  className?: string
}

/** M3-style circular indeterminate progress ring. Color comes from `className` (e.g. `text-fabpink`) via currentColor. */
export function LoadingIndicator({ size = 20, className = '' }: Props) {
  const style: CSSProperties & Record<'--loading-ring-thickness', string> = {
    width: size,
    height: size,
    '--loading-ring-thickness': `${Math.max(2, Math.round(size / 10))}px`,
  }

  return <span aria-hidden="true" className={`loading-ring inline-block shrink-0 ${className}`} style={style} />
}
