import * as React from 'react'

import { cn } from '@/lib/utils'

interface MarqueeProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  gap?: number
  pauseOnHover?: boolean
  repeat?: number
  reverse?: boolean
  vertical?: boolean
}

function Marquee(props: MarqueeProps) {
  const {
    children,
    className,
    duration = 40,
    delay = 0,
    gap = 1,
    pauseOnHover = false,
    repeat = 4,
    reverse = false,
    vertical = false,
    ...rest
  } = props

  return (
    <div
      style={
        {
          '--marquee-duration': `${duration}s`,
          '--marquee-delay': `${delay}s`,
          '--marquee-gap': `${gap}rem`,
          gap: `${gap}rem`
        } as React.CSSProperties
      }
      className={cn(
        'group flex overflow-hidden p-3',
        {
          'flex-row': !vertical,
          'flex-col': vertical
        },
        className
      )}
      {...rest}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            style={{ gap: `${gap}rem` }}
            className={cn('flex shrink-0 justify-around [animation-delay:var(--marquee-delay)]', {
              'animate-marquee-horizontal flex-row': !vertical,
              'animate-marquee-vertical flex-col': vertical,
              'group-hover:[animation-play-state:paused]': pauseOnHover,
              '[animation-direction:reverse]': reverse
            })}
          >
            {children}
          </div>
        ))}
    </div>
  )
}

export { Marquee, type MarqueeProps }
