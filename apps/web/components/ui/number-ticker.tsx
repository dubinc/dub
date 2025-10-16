'use client'

import * as React from 'react'

import { useInView, useMotionValue, useSpring } from 'motion/react'

import { cn } from '@/lib/utils'

interface NumberTickerProps extends React.ComponentPropsWithoutRef<'span'> {
  value: number
  startValue?: number
  direction?: 'up' | 'down'
  delay?: number
  decimalPlaces?: number
  damping?: number
  stiffness?: number
}

function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  damping = 30,
  stiffness = 200,
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === 'down' ? value : startValue)

  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  })

  const isInView = useInView(ref, { once: true, margin: '0px' })

  React.useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? startValue : value)
      }, delay * 1000)

      return () => clearTimeout(timer)
    }
  }, [motionValue, isInView, delay, value, direction, startValue])

  React.useEffect(
    () =>
      springValue.on('change', latest => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [springValue, decimalPlaces]
  )

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {startValue}
    </span>
  )
}

export { NumberTicker, type NumberTickerProps }
