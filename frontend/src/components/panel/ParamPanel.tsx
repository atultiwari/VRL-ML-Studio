import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { BookOpen, Loader2, Settings, Sliders, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildDefaultValues, buildParamSchema } from '@/lib/paramSchema'
import type { ParameterSpec } from '@/lib/types'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import { ParamControl } from './ParamControl'
import { api } from '@/lib/api'

type Tab = 'basic' | 'advanced' | 'help'

export function ParamPanel() {
  const selectedNodeId    = useUIStore(s => s.selectedNodeId)
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId)
  const nodes             = usePipelineStore(s => s.nodes)
  const updateNodeParams  = usePipelineStore(s => s.updateNodeParams)

  const node = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const [activeTab, setActiveTab] = useState<Tab>('basic')

  // ── File upload (for csv_loader / excel_loader) ────────────────────────
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const hasFilePath = node?.data.manifest.parameters.some(
    p => p.id === 'file_path' && p.tier === 'hidden'
  ) ?? false

  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedNodeId) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ path: string; name: string }>('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const current = usePipelineStore.getState().nodes.find(n => n.id === selectedNodeId)
      updateNodeParams(selectedNodeId, {
        ...current?.data.parameters,
        file_path: data.path,
        file_name: data.name,
      })
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }, [selectedNodeId, updateNodeParams])

  const manifest   = node?.data.manifest
  const params     = manifest?.parameters ?? []
  const basicParams    = params.filter(p => p.tier === 'basic')
  const advancedParams = params.filter(p => p.tier === 'advanced')

  const schema   = useMemo(() => buildParamSchema(params), [params])
  const defaults = useMemo(() => buildDefaultValues(params), [params])

  const { watch, reset, formState: { errors } } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: { ...defaults, ...node?.data.parameters },
  })

  // Sync form → store on every valid change
  useEffect(() => {
    const sub = watch(values => {
      if (selectedNodeId) updateNodeParams(selectedNodeId, values as Record<string, unknown>)
    })
    return sub.unsubscribe
  }, [watch, selectedNodeId, updateNodeParams])

  // Reset form when a different node is selected
  useEffect(() => {
    if (node) {
      reset({ ...defaults, ...node.data.parameters })
    }
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(() => {
    reset(defaults)
    if (selectedNodeId) updateNodeParams(selectedNodeId, defaults)
  }, [reset, defaults, selectedNodeId, updateNodeParams])

  const renderFields = (fields: ParameterSpec[]) => {
    if (fields.length === 0) {
      return (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No {activeTab} parameters
        </p>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        {fields.map(spec => (
          <ParamControl
            key={spec.id}
            spec={spec}
            value={watch(spec.id)}
            onChange={val => {
              // Update via react-hook-form's internal setValue equivalent
              // We use the form watch + direct store update pattern
              if (selectedNodeId) {
                const current = watch()
                updateNodeParams(selectedNodeId, { ...current, [spec.id]: val })
              }
            }}
            error={(errors[spec.id]?.message as string | undefined)}
          />
        ))}
      </div>
    )
  }

  if (!node || !manifest) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'basic',    label: 'Basic',    icon: <Settings  className="h-3.5 w-3.5" />, count: basicParams.length    },
    { id: 'advanced', label: 'Advanced', icon: <Sliders   className="h-3.5 w-3.5" />, count: advancedParams.length },
    { id: 'help',     label: 'Help',     icon: <BookOpen  className="h-3.5 w-3.5" />                               },
  ]

  return (
    <aside
      className={cn(
        'flex w-[var(--panel-width)] shrink-0 flex-col',
        'border-l border-border bg-card'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: manifest.color }}
            />
            <span className="truncate text-xs font-semibold text-foreground">
              {node.data.label}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{manifest.id}</p>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* File upload (csv_loader / excel_loader) */}
      {hasFilePath && (
        <div className="border-b border-border px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-xs',
              'text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground',
              uploading && 'opacity-60'
            )}
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />
            }
            {uploading
              ? 'Uploading…'
              : node?.data.parameters?.file_name
                ? String(node.data.parameters.file_name)
                : 'Choose file…'
            }
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'rounded-full px-1 py-px text-[9px] leading-none',
                activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'basic' && renderFields(basicParams)}
        {activeTab === 'advanced' && renderFields(advancedParams)}
        {activeTab === 'help' && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="text-xs leading-relaxed text-foreground">
                {manifest.description || 'No description available.'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </p>
              <p className="text-xs text-foreground">{manifest.category}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Version
              </p>
              <p className="text-xs text-foreground">
                {manifest.version} · {manifest.is_builtin ? 'Built-in' : 'Custom'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ports
              </p>
              {[...manifest.inputs.map(p => ({ ...p, dir: 'in' as const })),
                ...manifest.outputs.map(p => ({ ...p, dir: 'out' as const }))].map(p => (
                <div key={`${p.dir}-${p.id}`} className="flex items-center gap-2 py-0.5">
                  <span className="w-6 text-[9px] font-medium uppercase text-muted-foreground">
                    {p.dir}
                  </span>
                  <span className="text-xs text-foreground">{p.label}</span>
                  <span className="ml-auto rounded px-1 py-px text-[9px] bg-muted text-muted-foreground">
                    {p.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — Reset button */}
      {params.length > 0 && activeTab !== 'help' && (
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={handleReset}
            className={cn(
              'w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground',
              'transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground'
            )}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </aside>
  )
}
