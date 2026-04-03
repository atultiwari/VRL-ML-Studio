import { create } from 'zustand'
import { api } from '@/lib/api'
import type { PipelineJSON } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  name: string
  path: string
  description: string
  last_modified: string
  tags: string[]
}

export interface CommitInfo {
  hash: string
  message: string
  timestamp: string
  author: string
}

export interface TemplateInfo {
  id: string
  name: string
  node_count: number
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface ProjectStore {
  // Current project
  currentProject: { name: string; path: string; branch: string } | null
  projectList: ProjectSummary[]
  history: CommitInfo[]
  templates: TemplateInfo[]

  // Loading states
  loadingProjects: boolean
  loadingHistory: boolean

  // History panel visibility
  historyOpen: boolean
  setHistoryOpen: (v: boolean) => void

  // Actions
  fetchProjects: () => Promise<void>
  fetchTemplates: () => Promise<void>
  createProject: (name: string, description: string, tags: string, template: string) => Promise<{ path: string; pipeline: PipelineJSON }>
  openProject: (path: string) => Promise<PipelineJSON>
  saveProject: (pipeline: PipelineJSON, message?: string) => Promise<string>
  fetchHistory: () => Promise<void>
  checkoutCommit: (hash: string) => Promise<PipelineJSON>
  closeProject: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  projectList: [],
  history: [],
  templates: [],
  loadingProjects: false,
  loadingHistory: false,
  historyOpen: false,

  setHistoryOpen: (v) => set({ historyOpen: v }),

  fetchProjects: async () => {
    set({ loadingProjects: true })
    try {
      const { data } = await api.get<ProjectSummary[]>('/projects')
      set({ projectList: data })
    } finally {
      set({ loadingProjects: false })
    }
  },

  fetchTemplates: async () => {
    try {
      const { data } = await api.get<TemplateInfo[]>('/project/templates')
      set({ templates: data })
    } catch {
      // Templates are optional — ignore errors
    }
  },

  createProject: async (name, description, tags, template) => {
    const { data } = await api.post('/project/create', null, {
      params: { name, description, tags, template },
    })
    set({
      currentProject: { name: data.name, path: data.project_path, branch: 'main' },
      history: [],
    })
    return { path: data.project_path, pipeline: data.pipeline }
  },

  openProject: async (path) => {
    const { data } = await api.get('/project/info', { params: { project_path: path } })
    set({
      currentProject: { name: data.name, path: data.path, branch: data.branch },
    })
    // Fetch history in background
    get().fetchHistory()
    return data.pipeline as PipelineJSON
  },

  saveProject: async (pipeline, message) => {
    const project = get().currentProject
    if (!project) throw new Error('No project open')
    const { data } = await api.post('/project/save', {
      project_path: project.path,
      pipeline,
      message: message ?? '',
    })
    // Refresh history after save
    get().fetchHistory()
    return data.commit_hash as string
  },

  fetchHistory: async () => {
    const project = get().currentProject
    if (!project) return
    set({ loadingHistory: true })
    try {
      const { data } = await api.get<CommitInfo[]>('/project/history', {
        params: { project_path: project.path },
      })
      set({ history: data })
    } finally {
      set({ loadingHistory: false })
    }
  },

  checkoutCommit: async (hash) => {
    const project = get().currentProject
    if (!project) throw new Error('No project open')
    const { data } = await api.post('/project/checkout', null, {
      params: { project_path: project.path, commit_hash: hash },
    })
    // Refresh history
    get().fetchHistory()
    return data.pipeline as PipelineJSON
  },

  closeProject: () => {
    set({ currentProject: null, history: [], historyOpen: false })
  },
}))
