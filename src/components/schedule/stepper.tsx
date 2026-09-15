'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperStep {
  id: number
  label: string
  description: string
}

export function Stepper({
  steps,
  current,
  onStepClick,
  maxReached,
}: {
  steps: StepperStep[]
  current: number
  onStepClick?: (id: number) => void
  maxReached: number
}) {
  return (
    <ol className="flex items-center w-full gap-1 sm:gap-2">
      {steps.map((step, idx) => {
        const isDone = step.id < current
        const isActive = step.id === current
        const isReachable = step.id <= maxReached && onStepClick
        return (
          <li key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepClick?.(step.id)}
              className={cn(
                'group flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 text-left transition-colors',
                isReachable && 'hover:bg-accent cursor-pointer',
                !isReachable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isDone && 'bg-primary border-primary text-primary-foreground',
                  isActive && 'bg-primary/10 border-primary text-primary',
                  !isDone && !isActive && 'border-border text-muted-foreground bg-background',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span className="hidden sm:flex flex-col leading-tight">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground/80 hidden md:block">
                  {step.description}
                </span>
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-1 sm:mx-2 transition-colors',
                  step.id < current ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
