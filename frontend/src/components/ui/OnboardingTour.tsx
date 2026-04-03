import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Button } from './Button'

const STORAGE_KEY = 'vrl-onboarding-seen'

interface TourStep {
  title: string
  description: string
  highlight: string // CSS selector-like description for visual reference
  icon: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Node Library',
    description:
      'Browse all available ML nodes in the sidebar. Drag any node onto the canvas to add it to your pipeline.',
    highlight: 'sidebar',
    icon: '📦',
  },
  {
    title: 'Visual Canvas',
    description:
      'Connect nodes by dragging from output ports to input ports. The canvas validates port types automatically.',
    highlight: 'canvas',
    icon: '🎨',
  },
  {
    title: 'Configure Parameters',
    description:
      'Click any node to open its parameter panel. Adjust settings like algorithm hyperparameters — no code needed.',
    highlight: 'panel',
    icon: '⚙️',
  },
  {
    title: 'Run Pipeline',
    description:
      'Hit the Run button to execute your pipeline. Watch each node light up as it processes, with live status updates.',
    highlight: 'toolbar-run',
    icon: '▶️',
  },
  {
    title: 'View Results',
    description:
      'Double-click any completed node to see its output — data tables, charts, metrics, and more.',
    highlight: 'output',
    icon: '📊',
  },
  {
    title: 'Save & Export',
    description:
      'Save your project with Git versioning, or export as a Python script or Jupyter notebook. Press ? anytime for keyboard shortcuts.',
    highlight: 'toolbar-save',
    icon: '💾',
  },
]

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setVisible(true)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }, [step, dismiss])

  if (!visible) return null

  const current = TOUR_STEPS[step]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          </div>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-primary'
                  : i < step
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <Button variant="default" size="sm" onClick={next} className="gap-1">
              {step === TOUR_STEPS.length - 1 ? 'Get started' : 'Next'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
