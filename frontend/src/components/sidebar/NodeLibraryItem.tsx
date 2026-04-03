import { cn } from '@/lib/utils'
import { DND_MIME } from '@/components/canvas/Canvas'
import type { NodeManifestWithUI } from '@/lib/types'

interface NodeLibraryItemProps {
  manifest: NodeManifestWithUI
}

export function NodeLibraryItem({ manifest }: NodeLibraryItemProps) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DND_MIME, manifest.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'flex cursor-grab items-center gap-2.5 rounded-md px-2.5 py-2',
        'border border-transparent bg-transparent',
        'text-xs text-foreground transition-all duration-100',
        'hover:border-[hsl(var(--node-border))] hover:bg-[hsl(var(--node-bg))] hover:shadow-sm',
        'active:cursor-grabbing active:opacity-80'
      )}
      title={manifest.description}
    >
      {/* Colour dot */}
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: manifest.color }}
      />

      <span className="min-w-0 flex-1 truncate font-medium">{manifest.name}</span>

      {!manifest.is_builtin && (
        <span className="shrink-0 rounded bg-violet-500/20 px-1 py-px text-[8px] font-semibold uppercase leading-none text-violet-400">
          custom
        </span>
      )}

      {manifest.badge_text && (
        <span
          className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase leading-none text-white"
          style={{ backgroundColor: manifest.color }}
        >
          {manifest.badge_text}
        </span>
      )}
    </div>
  )
}
