import { ArrowRight, GitBranch, Play, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Shown in the canvas area during Stage 1. Replaced by React Flow in Stage 2. */
export function CanvasPlaceholder() {
  return (
    <main className={cn('canvas-grid flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden')}>
      {/* Pipeline preview — static illustration */}
      <div className="flex flex-col items-center gap-2 opacity-20 select-none pointer-events-none">
        <div className="flex items-center gap-3">
          {['CSV Input', 'Imputer', 'Scaler', 'Random Forest', 'Metrics'].map(
            (label, i, arr) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-12 items-center justify-center rounded-lg border border-[hsl(var(--node-border))]',
                    'bg-[hsl(var(--node-bg))] px-3 text-xs font-medium text-foreground'
                  )}
                >
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">
            Canvas ready in Stage 2
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The drag-and-drop pipeline builder will appear here. For now, the backend
            node registry and DAG executor are operational.
          </p>
        </div>

        {/* Stage 1 status indicators */}
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Stage 1 — Foundation
          </p>
          {[
            { icon: <Zap className="h-3 w-3" />,        label: 'FastAPI backend',        done: true },
            { icon: <GitBranch className="h-3 w-3" />,  label: 'Node package spec',      done: true },
            { icon: <Play className="h-3 w-3" />,       label: 'DAG executor + cache',   done: true },
            { icon: <ArrowRight className="h-3 w-3" />, label: 'Passthrough node',       done: true },
          ].map(({ icon, label, done }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={done ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              {done && (
                <span className="ml-auto text-[10px] font-medium text-primary">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
