import { useCallback, useEffect, useRef } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportNodePackage } from '@/lib/api'

interface NodeContextMenuProps {
  x: number
  y: number
  nodeId: string
  nodeType: string
  onClose: () => void
  onDelete: (nodeId: string) => void
}

export function NodeContextMenu({ x, y, nodeId, nodeType, onClose, onDelete }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportNodePackage(nodeType)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nodeType.replace(/\./g, '_') + '.vrlnode'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — toast could be added later
    }
    onClose()
  }, [nodeType, onClose])

  const handleDelete = useCallback(() => {
    onDelete(nodeId)
    onClose()
  }, [nodeId, onDelete, onClose])

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[100] min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-xl',
        'animate-in fade-in-0 zoom-in-95',
      )}
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleExport}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
      >
        <Download className="h-3.5 w-3.5 text-muted-foreground" />
        Export as .vrlnode
      </button>
      <div className="mx-2 my-1 h-px bg-border" />
      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Node
      </button>
    </div>
  )
}
