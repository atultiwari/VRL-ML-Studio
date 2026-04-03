import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:  'bg-muted text-muted-foreground',
  success:  'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
  warning:  'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
  error:    'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30',
  info:     'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30',
  outline:  'bg-transparent text-muted-foreground ring-1 ring-inset ring-border',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
