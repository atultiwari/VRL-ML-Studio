import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Eye,
  Target,
  Settings2,
  Split,
  Brain,
  Play,
  Upload,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWizardStore, type TaskType } from '@/store/wizardStore'
import { datasetPreview, uploadFile } from '@/lib/api'
import type { PipelineJSON, PipelineNodeJSON, PipelineEdgeJSON } from '@/lib/types'

// ── Algorithm definitions ────────────────────────────────────────────────────

interface AlgoInfo {
  id: string
  name: string
  description: string
}

const CLASSIFICATION_ALGOS: AlgoInfo[] = [
  { id: 'vrl.core.logistic_regression', name: 'Logistic Regression', description: 'Simple, interpretable linear classifier' },
  { id: 'vrl.core.decision_tree_classifier', name: 'Tree', description: 'Single decision tree, easy to visualize' },
  { id: 'vrl.core.random_forest_classifier', name: 'Random Forest', description: 'Ensemble of trees, strong baseline' },
  { id: 'vrl.core.gradient_boosting_classifier', name: 'Gradient Boosting', description: 'Boosted ensemble, high accuracy' },
  { id: 'vrl.core.xgboost_classifier', name: 'XGBoost', description: 'Optimized gradient boosting' },
  { id: 'vrl.core.svm_classifier', name: 'SVM', description: 'Support vector machine with kernel trick' },
  { id: 'vrl.core.knn_classifier', name: 'kNN', description: 'Instance-based, distance metric learning' },
  { id: 'vrl.core.naive_bayes', name: 'Naive Bayes', description: 'Probabilistic, fast training' },
]

const REGRESSION_ALGOS: AlgoInfo[] = [
  { id: 'vrl.core.linear_regression', name: 'Linear Regression', description: 'Simple linear model' },
  { id: 'vrl.core.ridge_regression', name: 'Ridge', description: 'L2-regularized linear model' },
  { id: 'vrl.core.lasso_regression', name: 'Lasso', description: 'L1-regularized, feature selection' },
  { id: 'vrl.core.decision_tree_regressor', name: 'Tree (Regressor)', description: 'Single decision tree for regression' },
  { id: 'vrl.core.random_forest_regressor', name: 'Random Forest (Regressor)', description: 'Ensemble of regression trees' },
  { id: 'vrl.core.xgboost_regressor', name: 'XGBoost (Regressor)', description: 'Optimized gradient boosting for regression' },
  { id: 'vrl.core.svr', name: 'SVR', description: 'Support vector regression' },
  { id: 'vrl.core.knn_regressor', name: 'kNN (Regressor)', description: 'Instance-based regression' },
]

const SAMPLE_DATASETS = [
  { id: 'iris', name: 'Iris', description: '150 flowers, 4 features, 3 classes', task: 'classification' as const },
  { id: 'titanic', name: 'Titanic', description: '891 passengers, survival prediction', task: 'classification' as const },
  { id: 'housing', name: 'California Housing', description: '20k+ houses, price prediction', task: 'regression' as const },
  { id: 'diabetes', name: 'Diabetes', description: '442 patients, disease progression', task: 'regression' as const },
]

// ── Step labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Dataset', icon: Database },
  { label: 'Overview', icon: Eye },
  { label: 'Target & Features', icon: Target },
  { label: 'Preprocessing', icon: Settings2 },
  { label: 'Split', icon: Split },
  { label: 'Algorithm', icon: Brain },
  { label: 'Build & Run', icon: Play },
]

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (pipeline: PipelineJSON, projectName: string) => void
  onCancel: () => void
}

// ── Main component ───────────────────────────────────────────────────────────

export function SmartWizard({ onComplete, onCancel }: Props) {
  const store = useWizardStore()

  // Load dataset preview — works for both sample datasets and uploaded CSVs
  const loadPreview = useCallback(async (dataset: string, filePath?: string) => {
    store.setLoadingPreview(true)
    try {
      const data = await datasetPreview(dataset, filePath)
      store.setPreviewData({
        columns: data.columns,
        columnNames: data.column_names,
        shape: data.shape,
        preview: data.preview,
      })

      // Auto-detect task type and suggest target column
      const dsInfo = SAMPLE_DATASETS.find(d => d.id === dataset)
      if (dsInfo) {
        store.setTaskType(dsInfo.task)
      }

      // Auto-suggest target (last column or known targets)
      const knownTargets: Record<string, string> = {
        iris: 'target',
        titanic: 'survived',
        housing: 'MedHouseVal',
        diabetes: 'target',
      }
      const target = filePath
        ? data.column_names[data.column_names.length - 1]
        : knownTargets[dataset] ?? data.column_names[data.column_names.length - 1]
      store.setTargetColumn(target)
      store.setFeatureColumns(data.column_names.filter(c => c !== target))

      // Pre-select a default algorithm
      const taskHint = dsInfo?.task ?? 'classification'
      const algos = taskHint === 'regression' ? REGRESSION_ALGOS : CLASSIFICATION_ALGOS
      store.setSelectedAlgorithms([algos[2].id]) // Random Forest by default
    } finally {
      store.setLoadingPreview(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPreview(store.sampleDataset)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDatasetChange = useCallback((dataset: string) => {
    store.setDatasetSource('sample')
    store.setSampleDataset(dataset)
    store.setUploadedFile('', '')
    loadPreview(dataset)
  }, [loadPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUploaded = useCallback((filePath: string, fileName: string) => {
    store.setDatasetSource('upload')
    store.setUploadedFile(filePath, fileName)
    loadPreview('', filePath)
  }, [loadPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuild = useCallback(() => {
    const pipeline = buildPipeline(store)
    const dsInfo = SAMPLE_DATASETS.find(d => d.id === store.sampleDataset)
    const projectName = store.datasetSource === 'upload'
      ? `${store.uploadedFileName.replace(/\.csv$/i, '')} Pipeline`
      : `${dsInfo?.name ?? 'ML'} Pipeline`
    onComplete(pipeline, projectName)
  }, [store, onComplete])

  const canProceed = useCallback((): boolean => {
    switch (store.step) {
      case 0: return store.datasetSource === 'upload' ? !!store.uploadedFilePath : !!store.sampleDataset
      case 1: return store.columns.length > 0
      case 2: return !!store.targetColumn && store.featureColumns.length > 0
      case 3: return true
      case 4: return store.testSize > 0 && store.testSize < 1
      case 5: return store.selectedAlgorithms.length > 0
      default: return true
    }
  }, [store])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold text-foreground">Smart Wizard</h1>
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Step indicator */}
      <div className="border-b border-border px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = i === store.step
            const done = i < store.step
            return (
              <button
                key={i}
                onClick={() => i <= store.step && store.setStep(i)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active && 'bg-primary/15 text-primary',
                  done && 'text-emerald-400 cursor-pointer hover:bg-muted',
                  !active && !done && 'text-muted-foreground/50 cursor-default'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {store.step === 0 && <StepDataset onSelectSample={handleDatasetChange} onFileUploaded={handleFileUploaded} />}
          {store.step === 1 && <StepOverview />}
          {store.step === 2 && <StepTargetFeatures />}
          {store.step === 3 && <StepPreprocessing />}
          {store.step === 4 && <StepSplit />}
          {store.step === 5 && <StepAlgorithm />}
          {store.step === 6 && <StepBuild />}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <button
          onClick={store.prevStep}
          disabled={store.step === 0}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors',
            store.step === 0
              ? 'text-muted-foreground/40 cursor-default'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {store.step < 6 ? (
          <button
            onClick={store.nextStep}
            disabled={!canProceed()}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors',
              canProceed()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-default'
            )}
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handleBuild}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            <Play className="h-3.5 w-3.5" /> Build Pipeline
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 1: Dataset Selection ────────────────────────────────────────────────

function StepDataset({ onSelectSample, onFileUploaded }: {
  onSelectSample: (id: string) => void
  onFileUploaded: (filePath: string, fileName: string) => void
}) {
  const datasetSource = useWizardStore(s => s.datasetSource)
  const selected = useWizardStore(s => s.sampleDataset)
  const uploadedFileName = useWizardStore(s => s.uploadedFileName)
  const loading = useWizardStore(s => s.loadingPreview)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadFile(file)
      onFileUploaded(result.path, result.name)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [onFileUploaded])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Choose a Dataset</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a sample dataset or upload your own CSV file.
        </p>
      </div>

      {/* Upload CSV */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload CSV</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || loading}
          className={cn(
            'flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-all',
            datasetSource === 'upload' && uploadedFileName
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30',
            (uploading || loading) && 'opacity-60 cursor-wait'
          )}
        >
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            datasetSource === 'upload' ? 'bg-primary/15' : 'bg-muted'
          )}>
            {uploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : datasetSource === 'upload' ? (
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="text-left">
            {datasetSource === 'upload' && uploadedFileName ? (
              <>
                <p className="text-sm font-medium text-foreground">{uploadedFileName}</p>
                <p className="text-[10px] text-muted-foreground">Click to choose a different file</p>
              </>
            ) : uploading ? (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Upload a CSV file</p>
                <p className="text-[10px] text-muted-foreground">Click to browse or drag and drop</p>
              </>
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploadError && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground">or pick a sample dataset</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Sample datasets */}
      <div className="grid grid-cols-2 gap-3">
        {SAMPLE_DATASETS.map(ds => (
          <button
            key={ds.id}
            onClick={() => onSelectSample(ds.id)}
            disabled={loading || uploading}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-4 text-left transition-all',
              datasetSource === 'sample' && selected === ds.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            <span className="text-sm font-medium text-foreground">{ds.name}</span>
            <span className="text-xs text-muted-foreground">{ds.description}</span>
            <span className={cn(
              'mt-1 inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-medium',
              ds.task === 'classification'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-cyan-500/15 text-cyan-400'
            )}>
              {ds.task}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground animate-pulse">Loading dataset preview...</p>
      )}
    </div>
  )
}

// ── Step 2: Data Overview ────────────────────────────────────────────────────

function StepOverview() {
  const columns = useWizardStore(s => s.columns)
  const columnNames = useWizardStore(s => s.columnNames)
  const shape = useWizardStore(s => s.shape)
  const preview = useWizardStore(s => s.preview)

  const missingTotal = columns.reduce((sum, c) => sum + c.missing, 0)
  const numericCount = columns.filter(c => c.is_numeric).length
  const categoricalCount = columns.length - numericCount

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Data Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {shape[0]} rows, {shape[1]} columns
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Rows', value: shape[0] },
          { label: 'Columns', value: shape[1] },
          { label: 'Numeric', value: numericCount },
          { label: 'Categorical', value: categoricalCount },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {missingTotal > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            {missingTotal} missing value{missingTotal > 1 ? 's' : ''} detected.
            The wizard will configure imputation automatically.
          </p>
        </div>
      )}

      {/* Column table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Column</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unique</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Missing</th>
            </tr>
          </thead>
          <tbody>
            {columns.map(c => (
              <tr key={c.name} className="border-t border-border/50">
                <td className="px-3 py-1.5 font-mono text-foreground">{c.name}</td>
                <td className="px-3 py-1.5">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    c.is_numeric ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                  )}>
                    {c.dtype}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{c.unique}</td>
                <td className={cn('px-3 py-1.5 text-right', c.missing > 0 ? 'text-amber-400' : 'text-muted-foreground')}>
                  {c.missing}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview rows */}
      {preview.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview (first 5 rows)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {columnNames.map(c => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-mono font-medium text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-1.5 text-foreground">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Target & Features ────────────────────────────────────────────────

function StepTargetFeatures() {
  const columns = useWizardStore(s => s.columns)
  const targetColumn = useWizardStore(s => s.targetColumn)
  const featureColumns = useWizardStore(s => s.featureColumns)
  const taskType = useWizardStore(s => s.taskType)
  const setTargetColumn = useWizardStore(s => s.setTargetColumn)
  const setFeatureColumns = useWizardStore(s => s.setFeatureColumns)
  const setTaskType = useWizardStore(s => s.setTaskType)

  const handleTargetChange = (col: string) => {
    setTargetColumn(col)
    setFeatureColumns(columns.map(c => c.name).filter(c => c !== col))
    // Auto-detect: low-unique numeric or non-numeric → classification
    const colInfo = columns.find(c => c.name === col)
    if (colInfo) {
      const isClassification = !colInfo.is_numeric || colInfo.unique <= 20
      setTaskType(isClassification ? 'classification' : 'regression')
    }
  }

  const toggleFeature = (col: string) => {
    setFeatureColumns(
      featureColumns.includes(col)
        ? featureColumns.filter(c => c !== col)
        : [...featureColumns, col]
    )
  }

  const selectAll = () => setFeatureColumns(columns.map(c => c.name).filter(c => c !== targetColumn))
  const deselectAll = () => setFeatureColumns([])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Target & Features</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the target variable and the features to use for training.
        </p>
      </div>

      {/* Target column */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Target Column</label>
        <select
          value={targetColumn}
          onChange={e => handleTargetChange(e.target.value)}
          className="h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground"
        >
          {columns.map(c => (
            <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>
          ))}
        </select>
      </div>

      {/* Task type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Task Type</label>
        <div className="flex gap-2">
          {(['classification', 'regression'] as TaskType[]).map(t => (
            <button
              key={t}
              onClick={() => setTaskType(t)}
              className={cn(
                'rounded-md border px-4 py-2 text-xs font-medium transition-colors',
                taskType === t
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feature columns */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">
            Feature Columns ({featureColumns.length} selected)
          </label>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] text-primary hover:underline">Select All</button>
            <button onClick={deselectAll} className="text-[10px] text-muted-foreground hover:underline">Deselect All</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {columns.filter(c => c.name !== targetColumn).map(c => (
            <label
              key={c.name}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                featureColumns.includes(c.name)
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <input
                type="checkbox"
                checked={featureColumns.includes(c.name)}
                onChange={() => toggleFeature(c.name)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-xs text-foreground truncate">{c.name}</span>
              <span className={cn(
                'ml-auto text-[10px] shrink-0',
                c.is_numeric ? 'text-blue-400' : 'text-purple-400'
              )}>
                {c.is_numeric ? 'num' : 'cat'}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 4: Preprocessing ────────────────────────────────────────────────────

function StepPreprocessing() {
  const columns = useWizardStore(s => s.columns)
  const featureColumns = useWizardStore(s => s.featureColumns)
  const imputeStrategy = useWizardStore(s => s.imputeStrategy)
  const encodingMethod = useWizardStore(s => s.encodingMethod)
  const scalingMethod = useWizardStore(s => s.scalingMethod)
  const setImputeStrategy = useWizardStore(s => s.setImputeStrategy)
  const setEncodingMethod = useWizardStore(s => s.setEncodingMethod)
  const setScalingMethod = useWizardStore(s => s.setScalingMethod)

  const selectedCols = columns.filter(c => featureColumns.includes(c.name))
  const hasMissing = selectedCols.some(c => c.missing > 0)
  const hasCategorical = selectedCols.some(c => !c.is_numeric)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preprocessing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how to clean and transform your data before training.
        </p>
      </div>

      {/* Imputation */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">
          Missing Value Strategy
          {!hasMissing && (
            <span className="ml-2 text-[10px] text-emerald-400">(no missing values detected)</span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {['mean', 'median', 'most_frequent', 'constant'].map(s => (
            <button
              key={s}
              onClick={() => setImputeStrategy(s)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                imputeStrategy === s
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Encoding */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">
          Categorical Encoding
          {!hasCategorical && (
            <span className="ml-2 text-[10px] text-emerald-400">(no categorical features)</span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {['onehot', 'label', 'ordinal'].map(m => (
            <button
              key={m}
              onClick={() => setEncodingMethod(m)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                encodingMethod === m
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {m === 'onehot' ? 'One-Hot' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Scaling */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Feature Scaling</label>
        <div className="flex flex-wrap gap-2">
          {['standard', 'minmax', 'robust'].map(m => (
            <button
              key={m}
              onClick={() => setScalingMethod(m)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                scalingMethod === m
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {m === 'minmax' ? 'Min-Max' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 5: Train/Test Split ─────────────────────────────────────────────────

function StepSplit() {
  const testSize = useWizardStore(s => s.testSize)
  const stratify = useWizardStore(s => s.stratify)
  const randomState = useWizardStore(s => s.randomState)
  const taskType = useWizardStore(s => s.taskType)
  const setTestSize = useWizardStore(s => s.setTestSize)
  const setStratify = useWizardStore(s => s.setStratify)
  const setRandomState = useWizardStore(s => s.setRandomState)
  const shape = useWizardStore(s => s.shape)

  const trainRows = Math.round(shape[0] * (1 - testSize))
  const testRows = shape[0] - trainRows

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Train / Test Split</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how to split data into training and testing sets.
        </p>
      </div>

      {/* Test size slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Test Size</label>
          <span className="text-xs font-mono text-primary">{Math.round(testSize * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={0.5}
          step={0.05}
          value={testSize}
          onChange={e => setTestSize(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Train: {trainRows} rows ({Math.round((1 - testSize) * 100)}%)</span>
          <span>Test: {testRows} rows ({Math.round(testSize * 100)}%)</span>
        </div>
      </div>

      {/* Stratify */}
      {taskType === 'classification' && (
        <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={stratify}
            onChange={e => setStratify(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          <div>
            <p className="text-xs font-medium text-foreground">Stratified Split</p>
            <p className="text-[10px] text-muted-foreground">
              Maintain class distribution in train and test sets
            </p>
          </div>
        </label>
      )}

      {/* Random state */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Random Seed</label>
        <input
          type="number"
          value={randomState}
          onChange={e => setRandomState(parseInt(e.target.value) || 42)}
          className="h-9 w-32 rounded-md border border-border bg-muted px-3 text-sm font-mono text-foreground"
        />
        <p className="text-[10px] text-muted-foreground">
          Same seed = reproducible split every time
        </p>
      </div>
    </div>
  )
}

// ── Step 6: Algorithm Selection ──────────────────────────────────────────────

function StepAlgorithm() {
  const taskType = useWizardStore(s => s.taskType)
  const selectedAlgorithms = useWizardStore(s => s.selectedAlgorithms)
  const toggleAlgorithm = useWizardStore(s => s.toggleAlgorithm)

  const algos = taskType === 'classification' ? CLASSIFICATION_ALGOS : REGRESSION_ALGOS

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Select {taskType === 'classification' ? 'Classification' : 'Regression'} Algorithm{selectedAlgorithms.length !== 1 ? 's' : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick one or more algorithms. Each will get its own model node and evaluation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {algos.map(a => {
          const selected = selectedAlgorithms.includes(a.id)
          return (
            <button
              key={a.id}
              onClick={() => toggleAlgorithm(a.id)}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-3 text-left transition-all',
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <span className="text-sm font-medium text-foreground">{a.name}</span>
              <span className="text-[10px] text-muted-foreground">{a.description}</span>
            </button>
          )
        })}
      </div>

      {selectedAlgorithms.length === 0 && (
        <p className="text-xs text-amber-400">Select at least one algorithm to continue.</p>
      )}
    </div>
  )
}

// ── Step 7: Build & Review ───────────────────────────────────────────────────

function StepBuild() {
  const store = useWizardStore()
  const algos = store.taskType === 'classification' ? CLASSIFICATION_ALGOS : REGRESSION_ALGOS

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review & Build</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your choices, then build and execute the pipeline.
        </p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border text-xs">
        <Row label="Dataset" value={
          store.datasetSource === 'upload'
            ? store.uploadedFileName
            : SAMPLE_DATASETS.find(d => d.id === store.sampleDataset)?.name ?? store.sampleDataset
        } />
        <Row label="Task" value={store.taskType} />
        <Row label="Target" value={store.targetColumn} />
        <Row label="Features" value={`${store.featureColumns.length} columns`} />
        <Row label="Imputation" value={store.imputeStrategy} />
        <Row label="Encoding" value={store.encodingMethod} />
        <Row label="Scaling" value={store.scalingMethod} />
        <Row label="Test Size" value={`${Math.round(store.testSize * 100)}%`} />
        <Row label="Stratify" value={store.stratify ? 'Yes' : 'No'} />
        <Row
          label="Algorithms"
          value={store.selectedAlgorithms
            .map(id => algos.find(a => a.id === id)?.name ?? id)
            .join(', ')}
        />
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs text-primary">
          Clicking "Build Pipeline" will create a project, load the pipeline onto the canvas,
          and auto-execute it so you can see results immediately.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

// ── Pipeline builder ─────────────────────────────────────────────────────────

function buildPipeline(state: ReturnType<typeof useWizardStore.getState>): PipelineJSON {
  const nodes: PipelineNodeJSON[] = []
  const edges: PipelineEdgeJSON[] = []
  let y = 80
  const x = 200
  const gap = 180
  let edgeIdx = 0
  let prevNodeId = ''
  let prevOutPort = ''

  const addNode = (type: string, label: string, params: Record<string, unknown>, outPort = 'dataframe_out', inPort = 'dataframe_in') => {
    const id = `${type.replace(/\./g, '_')}-wizard-${Date.now()}-${nodes.length}`
    const node: PipelineNodeJSON = { id, type, label, position: { x, y }, parameters: params }
    nodes.push(node)
    if (prevNodeId) {
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: prevNodeId,
        target: id,
        sourcePort: prevOutPort,
        targetPort: inPort,
      })
    }
    prevNodeId = id
    prevOutPort = outPort
    y += gap
    return id
  }

  // 1. Dataset
  if (state.datasetSource === 'upload' && state.uploadedFilePath) {
    addNode('vrl.core.csv_loader', 'CSV File Import', {
      file_path: state.uploadedFilePath,
      delimiter: ',',
      encoding: 'utf-8',
      header_row: 0,
      parse_dates: false,
    })
  } else {
    addNode('vrl.core.sample_dataset', 'Datasets', { dataset: state.sampleDataset })
  }

  // 2. Select features + target (keep only the columns the user picked plus target)
  const allCols = [...state.featureColumns, state.targetColumn]
  addNode('vrl.core.feature_selector', 'Select Columns', {
    method: 'manual',
    columns: allCols,
    threshold: 0.0,
    correlation_target: null,
  })

  // 3. Impute missing values
  addNode('vrl.core.missing_value_imputer', 'Impute', {
    strategy: state.imputeStrategy,
    fill_value: '',
    columns: [],
  })

  // 4. Encode categoricals
  const hasCategorical = state.columns.some(c => state.featureColumns.includes(c.name) && !c.is_numeric)
  if (hasCategorical) {
    addNode('vrl.core.encoder', 'Continuize', {
      method: state.encodingMethod,
      columns: [],
      drop_first: true,
    })
  }

  // 5. Scale features
  addNode('vrl.core.feature_scaler', 'Preprocess', {
    method: state.scalingMethod,
    columns: [],
  })

  // 6. Train/Test Split
  const splitterId = addNode('vrl.core.train_test_splitter', 'Data Sampler', {
    test_size: state.testSize,
    random_state: state.randomState,
    stratify: state.stratify,
    target_col: state.targetColumn,
  }, 'split_data_out')

  // 7. Model(s) + evaluation(s)
  const modelStartY = y
  const modelX = x
  const evalXBase = modelX + 320

  state.selectedAlgorithms.forEach((algoId, idx) => {
    const algoList = state.taskType === 'classification' ? CLASSIFICATION_ALGOS : REGRESSION_ALGOS
    const algo = algoList.find(a => a.id === algoId)
    const modelLabel = algo?.name ?? 'Model'

    // Model node
    const col = idx
    const myY = modelStartY + col * gap
    const modelNodeId = `${algoId.replace(/\./g, '_')}-wizard-${Date.now()}-model-${idx}`
    nodes.push({
      id: modelNodeId,
      type: algoId,
      label: modelLabel,
      position: { x: modelX, y: myY },
      parameters: { random_state: state.randomState },
    })
    // Edge from splitter to model
    edges.push({
      id: `edge-wizard-${edgeIdx++}`,
      source: splitterId,
      target: modelNodeId,
      sourcePort: 'split_data_out',
      targetPort: 'split_data_in',
    })

    // Evaluation nodes
    if (state.taskType === 'classification') {
      // Classification Report
      const reportId = `vrl_core_classification_report-wizard-${Date.now()}-eval-${idx}`
      nodes.push({
        id: reportId,
        type: 'vrl.core.classification_report',
        label: 'Test & Score',
        position: { x: evalXBase, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: reportId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: reportId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // Confusion Matrix
      const cmId = `vrl_core_confusion_matrix-wizard-${Date.now()}-cm-${idx}`
      nodes.push({
        id: cmId,
        type: 'vrl.core.confusion_matrix',
        label: 'Confusion Matrix',
        position: { x: evalXBase + 280, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: cmId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: cmId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // ROC curve
      const rocId = `vrl_core_roc_auc_curve-wizard-${Date.now()}-roc-${idx}`
      nodes.push({
        id: rocId,
        type: 'vrl.core.roc_auc_curve',
        label: 'ROC Analysis',
        position: { x: evalXBase + 560, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: rocId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: rocId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })
    } else {
      // Regression Report
      const reportId = `vrl_core_regression_report-wizard-${Date.now()}-eval-${idx}`
      nodes.push({
        id: reportId,
        type: 'vrl.core.regression_report',
        label: 'Regression Report',
        position: { x: evalXBase, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: reportId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: reportId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // Actual vs Predicted
      const avpId = `vrl_core_actual_vs_predicted-wizard-${Date.now()}-avp-${idx}`
      nodes.push({
        id: avpId,
        type: 'vrl.core.actual_vs_predicted',
        label: 'Actual vs Predicted',
        position: { x: evalXBase + 280, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: avpId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: avpId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // Residual Plot
      const resId = `vrl_core_residual_plot-wizard-${Date.now()}-res-${idx}`
      nodes.push({
        id: resId,
        type: 'vrl.core.residual_plot',
        label: 'Residual Plot',
        position: { x: evalXBase + 560, y: myY },
        parameters: { target_col: state.targetColumn },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: resId,
        sourcePort: 'model_out',
        targetPort: 'model_in',
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: resId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })
    }
  })

  return { version: '1.0', nodes, edges }
}
