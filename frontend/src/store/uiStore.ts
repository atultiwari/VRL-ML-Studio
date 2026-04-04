import { create } from 'zustand'

type RunToHereHandler = (nodeId: string) => void

interface UIStore {
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  // Callback for per-node "Run to here" button — set by App once
  runToHereHandler: RunToHereHandler | null
  setRunToHereHandler: (handler: RunToHereHandler | null) => void

  // Node currently being renamed (triggered from context menu)
  renamingNodeId: string | null
  setRenamingNodeId: (id: string | null) => void

  // Sidebar collapsed state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  runToHereHandler: null,
  setRunToHereHandler: (handler) => set({ runToHereHandler: handler }),

  renamingNodeId: null,
  setRenamingNodeId: (id) => set({ renamingNodeId: id }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
}))
