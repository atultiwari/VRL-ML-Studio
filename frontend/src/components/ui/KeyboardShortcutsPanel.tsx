import { useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

interface ShortcutGroup {
  label: string
  shortcuts: { keys: string[]; description: string }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Canvas',
    shortcuts: [
      { keys: ['Click'], description: 'Select node' },
      { keys: ['Shift', 'Drag'], description: 'Box-select multiple nodes' },
      { keys: ['Backspace'], description: 'Delete selected nodes/edges' },
      { keys: ['Delete'], description: 'Delete selected nodes/edges' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Middle-click', 'Drag'], description: 'Pan canvas' },
      { keys: ['Right-click'], description: 'Node context menu' },
      { keys: ['Double-click'], description: 'Open node output preview' },
    ],
  },
  {
    label: 'Pipeline',
    shortcuts: [
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'Y'], description: 'Redo (alt)' },
      { keys: ['⌘', 'S'], description: 'Save project' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this panel' },
    ],
  },
]

interface KeyboardShortcutsPanelProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsPanel({ open, onClose }: KeyboardShortcutsPanelProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleKey])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map(shortcut => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-foreground/80">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="text-[10px] text-muted-foreground mx-0.5">+</span>
                          )}
                          <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground/70">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> to toggle &middot; <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
