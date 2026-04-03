import { create } from 'zustand'

interface UIStore {
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}))
