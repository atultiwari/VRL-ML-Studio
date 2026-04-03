import { create } from 'zustand'
import type { DatasetColumnInfo } from '@/lib/api'

export type TaskType = 'classification' | 'regression'

export type DatasetSource = 'sample' | 'upload'

export interface WizardState {
  // Navigation
  step: number
  totalSteps: number

  // Step 1: Dataset
  datasetSource: DatasetSource
  sampleDataset: string
  uploadedFilePath: string
  uploadedFileName: string

  // Step 2: Data overview (populated after loading)
  columns: DatasetColumnInfo[]
  columnNames: string[]
  shape: [number, number]
  preview: unknown[][]
  loadingPreview: boolean

  // Step 3: Target & Features
  targetColumn: string
  featureColumns: string[]
  taskType: TaskType

  // Step 4: Preprocessing
  imputeStrategy: string
  encodingMethod: string
  scalingMethod: string

  // Step 5: Train/Test Split
  testSize: number
  stratify: boolean
  randomState: number

  // Step 6: Algorithms
  selectedAlgorithms: string[]

  // Step 7: completed flag
  completed: boolean
}

interface WizardActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  setDatasetSource: (v: DatasetSource) => void
  setSampleDataset: (v: string) => void
  setUploadedFile: (path: string, name: string) => void
  setPreviewData: (data: {
    columns: DatasetColumnInfo[]
    columnNames: string[]
    shape: [number, number]
    preview: unknown[][]
  }) => void
  setLoadingPreview: (v: boolean) => void

  setTargetColumn: (v: string) => void
  setFeatureColumns: (v: string[]) => void
  setTaskType: (v: TaskType) => void

  setImputeStrategy: (v: string) => void
  setEncodingMethod: (v: string) => void
  setScalingMethod: (v: string) => void

  setTestSize: (v: number) => void
  setStratify: (v: boolean) => void
  setRandomState: (v: number) => void

  setSelectedAlgorithms: (v: string[]) => void
  toggleAlgorithm: (id: string) => void

  setCompleted: (v: boolean) => void
  reset: () => void
}

const INITIAL_STATE: WizardState = {
  step: 0,
  totalSteps: 7,
  datasetSource: 'sample',
  sampleDataset: 'iris',
  uploadedFilePath: '',
  uploadedFileName: '',
  columns: [],
  columnNames: [],
  shape: [0, 0],
  preview: [],
  loadingPreview: false,
  targetColumn: '',
  featureColumns: [],
  taskType: 'classification',
  imputeStrategy: 'mean',
  encodingMethod: 'onehot',
  scalingMethod: 'standard',
  testSize: 0.2,
  stratify: true,
  randomState: 42,
  selectedAlgorithms: [],
  completed: false,
}

export const useWizardStore = create<WizardState & WizardActions>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),
  nextStep: () => set(s => ({ step: Math.min(s.step + 1, s.totalSteps - 1) })),
  prevStep: () => set(s => ({ step: Math.max(s.step - 1, 0) })),

  setDatasetSource: (datasetSource) => set({ datasetSource }),
  setSampleDataset: (sampleDataset) => set({ sampleDataset }),
  setUploadedFile: (path, name) => set({ uploadedFilePath: path, uploadedFileName: name }),
  setPreviewData: (data) => set({
    columns: data.columns,
    columnNames: data.columnNames,
    shape: data.shape,
    preview: data.preview,
  }),
  setLoadingPreview: (loadingPreview) => set({ loadingPreview }),

  setTargetColumn: (targetColumn) => set({ targetColumn }),
  setFeatureColumns: (featureColumns) => set({ featureColumns }),
  setTaskType: (taskType) => set({ taskType }),

  setImputeStrategy: (imputeStrategy) => set({ imputeStrategy }),
  setEncodingMethod: (encodingMethod) => set({ encodingMethod }),
  setScalingMethod: (scalingMethod) => set({ scalingMethod }),

  setTestSize: (testSize) => set({ testSize }),
  setStratify: (stratify) => set({ stratify }),
  setRandomState: (randomState) => set({ randomState }),

  setSelectedAlgorithms: (selectedAlgorithms) => set({ selectedAlgorithms }),
  toggleAlgorithm: (id) => set(s => {
    const current = s.selectedAlgorithms
    return {
      selectedAlgorithms: current.includes(id)
        ? current.filter(a => a !== id)
        : [...current, id],
    }
  }),

  setCompleted: (completed) => set({ completed }),
  reset: () => set(INITIAL_STATE),
}))
