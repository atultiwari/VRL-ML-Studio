import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Eye,
  Target,
  Settings2,
  AlertTriangle,
  Split,
  Brain,
  Play,
  Upload,
  FileSpreadsheet,
  Loader2,
  FileCode,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWizardStore, type TaskType, type WizardTemplate } from '@/store/wizardStore'
import { datasetPreview, uploadFile, exportPython, exportNotebook, type DatasetColumnInfo } from '@/lib/api'
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

const CLUSTERING_ALGOS: AlgoInfo[] = [
  { id: 'vrl.core.kmeans', name: 'K-Means', description: 'Partition-based, specify number of clusters' },
  { id: 'vrl.core.hierarchical_clustering', name: 'Hierarchical', description: 'Agglomerative, produces dendrogram' },
  { id: 'vrl.core.dbscan', name: 'DBSCAN', description: 'Density-based, finds arbitrary-shape clusters' },
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
  { label: 'Outliers', icon: AlertTriangle },
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
        duplicateRows: data.duplicate_rows ?? 0,
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

      // Auto-apply smart preprocessing defaults based on data characteristics
      const featureCols = data.columns.filter(c => c.name !== target)
      store.setImputeStrategy(recommendImputation(featureCols).value)
      store.setEncodingMethod(recommendEncoding(featureCols).value)
      store.setScalingMethod(recommendScaling(featureCols).value)
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

  const getPipelineName = useCallback((): string => {
    const dsInfo = SAMPLE_DATASETS.find(d => d.id === store.sampleDataset)
    return store.datasetSource === 'upload'
      ? `${store.uploadedFileName.replace(/\.csv$/i, '')} Pipeline`
      : `${dsInfo?.name ?? 'ML'} Pipeline`
  }, [store])

  const handleBuild = useCallback(() => {
    const pipeline = buildPipeline(store)
    onComplete(pipeline, getPipelineName())
  }, [store, onComplete, getPipelineName])

  const [exporting, setExporting] = useState<'python' | 'notebook' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = useCallback(async (format: 'python' | 'notebook') => {
    setExporting(format)
    setExportError(null)
    try {
      const pipeline = buildPipeline(store)
      const name = getPipelineName()
      const blob = format === 'python'
        ? await exportPython(pipeline, name)
        : await exportNotebook(pipeline, name)

      const ext = format === 'python' ? '.py' : '.ipynb'
      const filename = name.replace(/\s+/g, '_').toLowerCase() + ext
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(null)
    }
  }, [store, getPipelineName])

  const canProceed = useCallback((): boolean => {
    switch (store.step) {
      case 0: return store.datasetSource === 'upload' ? !!store.uploadedFilePath : !!store.sampleDataset
      case 1: return store.columns.length > 0
      case 2: return store.featureColumns.length > 0 && (store.taskType === 'clustering' || !!store.targetColumn)
      case 3: return true
      case 4: return true // outliers step is always optional
      case 5: return store.testSize > 0 && store.testSize < 1
      case 6: return store.selectedAlgorithms.length > 0
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
          {store.step === 4 && <StepOutliers />}
          {store.step === 5 && <StepSplit />}
          {store.step === 6 && <StepAlgorithm />}
          {store.step === 7 && <StepBuild exportError={exportError} />}
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

        {store.step < 7 ? (
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('python')}
              disabled={!!exporting}
              className={cn(
                'flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors',
                exporting === 'python'
                  ? 'opacity-60 cursor-wait'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {exporting === 'python' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode className="h-3.5 w-3.5" />}
              Export .py
            </button>
            <button
              onClick={() => handleExport('notebook')}
              disabled={!!exporting}
              className={cn(
                'flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors',
                exporting === 'notebook'
                  ? 'opacity-60 cursor-wait'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {exporting === 'notebook' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
              Export .ipynb
            </button>
            <button
              onClick={handleBuild}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Play className="h-3.5 w-3.5" /> Build Pipeline
            </button>
          </div>
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

  const template = useWizardStore(s => s.template)
  const setTemplate = useWizardStore(s => s.setTemplate)

  const templates: { id: WizardTemplate; name: string; desc: string }[] = [
    { id: 'custom', name: 'Custom', desc: 'Configure every step yourself' },
    { id: 'quick_classification', name: 'Quick Classification', desc: 'Sensible defaults, Random Forest, minimal config' },
    { id: 'thorough_comparison', name: 'Compare All Models', desc: 'All algorithms + full evaluation for each' },
    { id: 'clustering_explore', name: 'Clustering / EDA', desc: 'Unsupervised — explore patterns with no target' },
  ]

  const applyTemplate = (tpl: WizardTemplate) => {
    const store = useWizardStore.getState()
    setTemplate(tpl)
    if (tpl === 'quick_classification') {
      store.setTaskType('classification')
      store.setImputeStrategy('median')
      store.setEncodingMethod('onehot')
      store.setScalingMethod('standard')
      store.setOutlierMethod('skip')
      store.setTestSize(0.2)
      store.setStratify(true)
    } else if (tpl === 'thorough_comparison') {
      store.setTaskType('classification')
      store.setImputeStrategy('median')
      store.setEncodingMethod('onehot')
      store.setScalingMethod('robust')
      store.setOutlierMethod('iqr')
      store.setOutlierAction('cap')
      store.setTestSize(0.2)
      store.setStratify(true)
      store.setSelectedAlgorithms(CLASSIFICATION_ALGOS.map(a => a.id))
    } else if (tpl === 'clustering_explore') {
      store.setTaskType('clustering')
      store.setTargetColumn('')
      store.setImputeStrategy('median')
      store.setEncodingMethod('label')
      store.setScalingMethod('standard')
      store.setOutlierMethod('skip')
      store.setSelectedAlgorithms([CLUSTERING_ALGOS[0].id])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Choose a Dataset</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a sample dataset or upload your own CSV file.
        </p>
      </div>

      {/* Template picker */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Start Template</h3>
        <div className="grid grid-cols-2 gap-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-all',
                template === t.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <span className="text-xs font-medium text-foreground">{t.name}</span>
              <span className="text-[10px] text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
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

function computeQualityScore(
  columns: DatasetColumnInfo[],
  nRows: number,
  duplicateRows: number,
): { score: number; issues: string[] } {
  let score = 100
  const issues: string[] = []

  // Missing values penalty
  const totalCells = nRows * columns.length
  const totalMissing = columns.reduce((s, c) => s + c.missing, 0)
  if (totalCells > 0) {
    const missingPct = (totalMissing / totalCells) * 100
    if (missingPct > 20) { score -= 25; issues.push(`${missingPct.toFixed(1)}% missing values — heavy imputation needed`) }
    else if (missingPct > 5) { score -= 15; issues.push(`${missingPct.toFixed(1)}% missing values`) }
    else if (missingPct > 0) { score -= 5; issues.push(`${missingPct.toFixed(1)}% missing values (minor)`) }
  }

  // Duplicate rows penalty
  if (nRows > 0) {
    const dupPct = (duplicateRows / nRows) * 100
    if (dupPct > 10) { score -= 15; issues.push(`${duplicateRows} duplicate rows (${dupPct.toFixed(1)}%)`) }
    else if (dupPct > 0) { score -= 5; issues.push(`${duplicateRows} duplicate rows`) }
  }

  // Constant columns penalty
  const constantCols = columns.filter(c => c.unique <= 1)
  if (constantCols.length > 0) {
    score -= constantCols.length * 5
    issues.push(`${constantCols.length} constant column${constantCols.length > 1 ? 's' : ''} (no predictive value)`)
  }

  // High cardinality categoricals penalty
  const highCardCats = columns.filter(c => !c.is_numeric && c.cardinality_ratio > 0.5)
  if (highCardCats.length > 0) {
    score -= highCardCats.length * 5
    issues.push(`${highCardCats.length} high-cardinality categorical${highCardCats.length > 1 ? 's' : ''} (>50% unique)`)
  }

  // Outlier penalty (mild)
  const totalOutliers = columns.reduce((s, c) => s + c.outlier_count, 0)
  if (totalOutliers > 0) {
    const outlierPct = nRows > 0 ? (totalOutliers / (nRows * columns.filter(c => c.is_numeric).length)) * 100 : 0
    if (outlierPct > 5) { score -= 10; issues.push(`High outlier density across numeric features`) }
    else { score -= 3; issues.push(`Some outliers detected (handled in preprocessing)`) }
  }

  // Too few rows penalty
  if (nRows < 50) { score -= 20; issues.push(`Very few rows (${nRows}) — model may not generalize`) }
  else if (nRows < 200) { score -= 10; issues.push(`Small dataset (${nRows} rows) — consider simpler models`) }

  return { score: Math.max(0, Math.min(100, score)), issues }
}

function qualityColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function qualityBg(score: number): string {
  if (score >= 80) return 'border-emerald-500/30 bg-emerald-500/5'
  if (score >= 60) return 'border-amber-500/30 bg-amber-500/5'
  return 'border-red-500/30 bg-red-500/5'
}

function StepOverview() {
  const columns = useWizardStore(s => s.columns)
  const columnNames = useWizardStore(s => s.columnNames)
  const shape = useWizardStore(s => s.shape)
  const preview = useWizardStore(s => s.preview)
  const duplicateRows = useWizardStore(s => s.duplicateRows)

  const missingTotal = columns.reduce((sum, c) => sum + c.missing, 0)
  const numericCount = columns.filter(c => c.is_numeric).length
  const categoricalCount = columns.length - numericCount

  const quality = computeQualityScore(columns, shape[0], duplicateRows)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Data Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {shape[0]} rows, {shape[1]} columns
        </p>
      </div>

      {/* Data quality score */}
      <div className={cn('rounded-lg border px-4 py-3', qualityBg(quality.score))}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Data Readiness Score</span>
          <span className={cn('text-lg font-bold', qualityColor(quality.score))}>{quality.score}/100</span>
        </div>
        {/* Score bar */}
        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', quality.score >= 80 ? 'bg-emerald-500' : quality.score >= 60 ? 'bg-amber-500' : 'bg-red-500')}
            style={{ width: `${quality.score}%` }}
          />
        </div>
        {quality.issues.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {quality.issues.map((issue, i) => (
              <li key={i} className="text-[10px] text-muted-foreground">• {issue}</li>
            ))}
          </ul>
        )}
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

  const selectAll = () => setFeatureColumns(columns.map(c => c.name).filter(c => taskType === 'clustering' || c !== targetColumn))
  const deselectAll = () => setFeatureColumns([])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Target & Features</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {taskType === 'clustering'
            ? 'Select the features to use for clustering.'
            : 'Choose the target variable and the features to use for training.'}
        </p>
      </div>

      {/* Target column (hidden for clustering) */}
      {taskType !== 'clustering' && (
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
      )}

      {/* Task type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Task Type</label>
        <div className="flex gap-2">
          {(['classification', 'regression', 'clustering'] as TaskType[]).map(t => (
            <button
              key={t}
              onClick={() => {
                setTaskType(t)
                if (t === 'clustering') {
                  setTargetColumn('')
                  setFeatureColumns(columns.map(c => c.name))
                }
              }}
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
        {taskType === 'clustering' && (
          <p className="text-[10px] text-muted-foreground italic">
            No target column needed — unsupervised learning finds patterns in the data.
          </p>
        )}
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
          {columns.filter(c => taskType === 'clustering' || c.name !== targetColumn).map(c => (
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

// ── Smart recommendation engine ─────────────────────────────────────────────

interface Recommendation {
  value: string
  reason: string
}

function recommendImputation(cols: DatasetColumnInfo[]): Recommendation {
  const numericWithMissing = cols.filter(c => c.is_numeric && c.missing > 0)
  const catWithMissing = cols.filter(c => !c.is_numeric && c.missing > 0)
  const hasSkewed = numericWithMissing.some(c => c.skewness !== null && Math.abs(c.skewness) > 1)

  if (catWithMissing.length > 0 && numericWithMissing.length === 0) {
    return { value: 'most_frequent', reason: 'Only categorical columns have missing values — mode is safest' }
  }
  if (hasSkewed) {
    return { value: 'median', reason: 'Some numeric features are skewed — median resists outlier pull' }
  }
  return { value: 'mean', reason: 'Numeric features look roughly symmetric — mean preserves distribution' }
}

function recommendEncoding(cols: DatasetColumnInfo[]): Recommendation {
  const highCard = cols.some(c => !c.is_numeric && c.unique > 15)
  if (highCard) {
    return { value: 'label', reason: 'High-cardinality categoricals detected — one-hot would create too many columns' }
  }
  return { value: 'onehot', reason: 'Low-cardinality categoricals — one-hot encoding preserves all information' }
}

function recommendScaling(cols: DatasetColumnInfo[]): Recommendation {
  const hasOutliers = cols.some(c => c.is_numeric && c.outlier_count > 0)
  if (hasOutliers) {
    return { value: 'robust', reason: 'Outliers detected — robust scaler uses IQR, not affected by extremes' }
  }
  return { value: 'standard', reason: 'No significant outliers — standard scaler (z-score) works well' }
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
  const hasNumeric = selectedCols.some(c => c.is_numeric)

  // Smart recommendations
  const imputeRec = recommendImputation(selectedCols)
  const encodeRec = recommendEncoding(selectedCols)
  const scaleRec = recommendScaling(selectedCols)

  // Warnings
  const highCardCols = selectedCols.filter(c => !c.is_numeric && c.unique > 50)
  const highMissingCols = selectedCols.filter(c => c.missing_pct > 40)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preprocessing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how to clean and transform your data. Smart recommendations are based on your data's characteristics.
        </p>
      </div>

      {/* Data warnings */}
      {highCardCols.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            <strong>High cardinality:</strong> {highCardCols.map(c => c.name).join(', ')} ha{highCardCols.length > 1 ? 've' : 's'} {'>'}50 unique values.
            One-hot encoding will create many columns — consider label encoding or dropping.
          </p>
        </div>
      )}
      {highMissingCols.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400">
            <strong>Heavy missingness:</strong> {highMissingCols.map(c => `${c.name} (${c.missing_pct}%)`).join(', ')}.
            Consider dropping these columns if they're not critical.
          </p>
        </div>
      )}

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
                'relative rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                imputeStrategy === s
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {s.replace('_', ' ')}
              {s === imputeRec.value && (
                <span className="ml-1.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-400">rec</span>
              )}
            </button>
          ))}
        </div>
        {hasMissing && (
          <p className="text-[10px] text-muted-foreground/80 italic">
            {imputeRec.reason}
          </p>
        )}
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
              {m === encodeRec.value && hasCategorical && (
                <span className="ml-1.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-400">rec</span>
              )}
            </button>
          ))}
        </div>
        {hasCategorical && (
          <p className="text-[10px] text-muted-foreground/80 italic">
            {encodeRec.reason}
          </p>
        )}
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
              {m === scaleRec.value && hasNumeric && (
                <span className="ml-1.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-400">rec</span>
              )}
            </button>
          ))}
        </div>
        {hasNumeric && (
          <p className="text-[10px] text-muted-foreground/80 italic">
            {scaleRec.reason}
          </p>
        )}
      </div>

      {/* Per-column preprocessing plan */}
      {selectedCols.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preprocessing Plan ({selectedCols.length} columns)
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Impute</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Encode</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Scale</th>
                </tr>
              </thead>
              <tbody>
                {selectedCols.map(c => {
                  const willImpute = c.missing > 0
                  const willEncode = !c.is_numeric
                  const willScale = c.is_numeric
                  return (
                    <tr key={c.name} className="border-t border-border/50">
                      <td className="px-3 py-1.5 font-mono text-foreground">{c.name}</td>
                      <td className="px-3 py-1.5">
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium',
                          c.is_numeric ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                        )}>
                          {c.is_numeric ? 'num' : 'cat'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {willImpute ? (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                            {imputeStrategy.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {willEncode ? (
                          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] text-purple-400">
                            {encodingMethod === 'onehot' ? 'one-hot' : encodingMethod}
                            {c.unique > 15 && encodingMethod === 'onehot' && (
                              <span className="ml-1 text-amber-400">!</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {willScale ? (
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-400">
                            {scalingMethod === 'minmax' ? 'min-max' : scalingMethod}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 5: Outlier Handling ─────────────────────────────────────────────────

function StepOutliers() {
  const columns = useWizardStore(s => s.columns)
  const featureColumns = useWizardStore(s => s.featureColumns)
  const outlierMethod = useWizardStore(s => s.outlierMethod)
  const outlierAction = useWizardStore(s => s.outlierAction)
  const outlierThreshold = useWizardStore(s => s.outlierThreshold)
  const setOutlierMethod = useWizardStore(s => s.setOutlierMethod)
  const setOutlierAction = useWizardStore(s => s.setOutlierAction)
  const setOutlierThreshold = useWizardStore(s => s.setOutlierThreshold)

  const numericCols = columns.filter(c => featureColumns.includes(c.name) && c.is_numeric)
  const colsWithOutliers = numericCols.filter(c => c.outlier_count > 0)
  const totalOutliers = colsWithOutliers.reduce((sum, c) => sum + c.outlier_count, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Outlier Handling</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalOutliers > 0
            ? `${totalOutliers} outlier${totalOutliers > 1 ? 's' : ''} detected across ${colsWithOutliers.length} column${colsWithOutliers.length > 1 ? 's' : ''} (IQR method).`
            : 'No outliers detected in your numeric features. You can skip this step.'}
        </p>
      </div>

      {/* Per-column outlier summary */}
      {colsWithOutliers.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Column</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Outliers</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">% of rows</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Skewness</th>
              </tr>
            </thead>
            <tbody>
              {colsWithOutliers.map(c => {
                const shape = useWizardStore.getState().shape
                const pct = shape[0] > 0 ? ((c.outlier_count / shape[0]) * 100).toFixed(1) : '0'
                return (
                  <tr key={c.name} className="border-t border-border/50">
                    <td className="px-3 py-1.5 font-mono text-foreground">{c.name}</td>
                    <td className="px-3 py-1.5 text-right text-amber-400">{c.outlier_count}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{pct}%</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {c.skewness !== null ? c.skewness : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Method */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground">Detection Method</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'skip' as const, label: 'Skip (no handling)' },
            { value: 'iqr' as const, label: 'IQR' },
            { value: 'zscore' as const, label: 'Z-Score' },
          ]).map(m => (
            <button
              key={m.value}
              onClick={() => setOutlierMethod(m.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                outlierMethod === m.value
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {m.label}
              {m.value === 'iqr' && totalOutliers > 0 && (
                <span className="ml-1.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-400">rec</span>
              )}
            </button>
          ))}
        </div>
        {outlierMethod === 'skip' && totalOutliers > 0 && (
          <p className="text-[10px] text-amber-400">
            Outliers will remain in the data — this may affect model performance.
          </p>
        )}
      </div>

      {/* Action (only if method != skip) */}
      {outlierMethod !== 'skip' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-foreground">Action</label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'remove' as const, label: 'Remove rows', desc: 'Drop rows containing outliers' },
              { value: 'cap' as const, label: 'Cap values', desc: 'Clip to boundary values' },
              { value: 'flag' as const, label: 'Flag only', desc: 'Add is_outlier column' },
            ]).map(a => (
              <button
                key={a.value}
                onClick={() => setOutlierAction(a.value)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-all',
                  outlierAction === a.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                )}
              >
                <span className="text-xs font-medium text-foreground">{a.label}</span>
                <span className="text-[10px] text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Threshold (only for IQR) */}
      {outlierMethod === 'iqr' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">IQR Multiplier</label>
            <span className="text-xs font-mono text-primary">{outlierThreshold}</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={outlierThreshold}
            onChange={e => setOutlierThreshold(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1.0 (aggressive)</span>
            <span>1.5 (standard)</span>
            <span>3.0 (lenient)</span>
          </div>
        </div>
      )}

      {/* Z-Score threshold */}
      {outlierMethod === 'zscore' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Z-Score Threshold</label>
            <span className="text-xs font-mono text-primary">{outlierThreshold}</span>
          </div>
          <input
            type="range"
            min={2.0}
            max={4.0}
            step={0.1}
            value={outlierThreshold}
            onChange={e => setOutlierThreshold(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>2.0 (aggressive)</span>
            <span>3.0 (standard)</span>
            <span>4.0 (lenient)</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 6: Train/Test Split ─────────────────────────────────────────────────

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

// ── Algorithm recommendation engine ──────────────────────────────────────────

type AlgoFit = 'recommended' | 'good' | 'caution'

interface AlgoRecommendation {
  fit: AlgoFit
  reason: string
}

function getAlgoRecommendation(
  algoId: string,
  nRows: number,
  nFeatures: number,
): AlgoRecommendation {
  const isSmall = nRows < 500
  const isLarge = nRows > 5000
  const isHighDim = nFeatures > 30

  if (algoId.includes('logistic_regression')) {
    if (isHighDim) return { fit: 'recommended', reason: 'Handles high dimensions well with built-in regularization' }
    if (isSmall) return { fit: 'recommended', reason: 'Simple model, less prone to overfitting on small data' }
    return { fit: 'good', reason: 'Solid interpretable baseline for any dataset' }
  }
  if (algoId.includes('decision_tree') && !algoId.includes('regressor')) {
    if (isSmall) return { fit: 'good', reason: 'Easy to visualize and interpret' }
    if (isLarge) return { fit: 'caution', reason: 'Single tree tends to overfit on large datasets — prefer ensemble' }
    return { fit: 'good', reason: 'Good for understanding feature splits' }
  }
  if (algoId.includes('random_forest')) {
    if (isSmall) return { fit: 'good', reason: 'Robust ensemble, but may overfit with few samples' }
    return { fit: 'recommended', reason: 'Strong baseline — handles mixed features and nonlinearity well' }
  }
  if (algoId.includes('gradient_boosting') && !algoId.includes('xgboost')) {
    if (isSmall) return { fit: 'caution', reason: 'Boosting can overfit on small datasets — tune carefully' }
    return { fit: 'recommended', reason: 'High accuracy boosted ensemble' }
  }
  if (algoId.includes('xgboost')) {
    if (isSmall) return { fit: 'caution', reason: 'Powerful but risks overfitting with <500 rows' }
    if (isLarge) return { fit: 'recommended', reason: 'Optimized for large datasets, often top performer' }
    return { fit: 'good', reason: 'Strong performer, needs tuning for best results' }
  }
  if (algoId.includes('svm') || algoId === 'vrl.core.svr') {
    if (isLarge) return { fit: 'caution', reason: 'SVM training is O(n^2) — slow on large datasets' }
    if (isHighDim) return { fit: 'recommended', reason: 'SVMs excel in high-dimensional spaces' }
    return { fit: 'good', reason: 'Effective with kernel trick for nonlinear boundaries' }
  }
  if (algoId.includes('knn')) {
    if (isLarge) return { fit: 'caution', reason: 'Prediction is slow on large datasets (stores all training data)' }
    if (isHighDim) return { fit: 'caution', reason: 'Distance metrics lose meaning in high dimensions' }
    return { fit: 'good', reason: 'Simple, no training phase — good for small-medium data' }
  }
  if (algoId.includes('naive_bayes')) {
    if (isSmall) return { fit: 'recommended', reason: 'Very fast, works well even with limited data' }
    return { fit: 'good', reason: 'Fast and simple — strong baseline for text-like features' }
  }
  if (algoId.includes('linear_regression')) {
    if (isSmall) return { fit: 'recommended', reason: 'Simple and interpretable — ideal starting point for small data' }
    return { fit: 'good', reason: 'Good interpretable baseline' }
  }
  if (algoId.includes('ridge')) {
    if (isHighDim) return { fit: 'recommended', reason: 'L2 regularization prevents overfitting in high dimensions' }
    return { fit: 'good', reason: 'Regularized linear model — stable and reliable' }
  }
  if (algoId.includes('lasso')) {
    if (isHighDim) return { fit: 'recommended', reason: 'L1 regularization performs built-in feature selection' }
    return { fit: 'good', reason: 'Automatic feature selection via L1 penalty' }
  }
  if (algoId.includes('elasticnet')) {
    if (isHighDim) return { fit: 'recommended', reason: 'Combines L1 + L2 — best of both for high-dimensional data' }
    return { fit: 'good', reason: 'Balanced regularization' }
  }
  if (algoId.includes('decision_tree_regressor')) {
    if (isLarge) return { fit: 'caution', reason: 'Single tree overfits — prefer ensemble for large data' }
    return { fit: 'good', reason: 'Interpretable, captures nonlinear patterns' }
  }
  // Clustering algorithms
  if (algoId.includes('kmeans')) {
    return { fit: 'recommended', reason: 'Most popular — works well when clusters are roughly spherical' }
  }
  if (algoId.includes('hierarchical')) {
    if (isLarge) return { fit: 'caution', reason: 'O(n^2) memory — slow on large datasets' }
    return { fit: 'good', reason: 'Produces dendrogram, no need to pre-specify k' }
  }
  if (algoId.includes('dbscan')) {
    return { fit: 'good', reason: 'Finds arbitrary-shape clusters, handles noise naturally' }
  }
  return { fit: 'good', reason: 'Suitable for this dataset' }
}

const FIT_STYLES: Record<AlgoFit, { badge: string; badgeClass: string }> = {
  recommended: { badge: 'Best fit', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  good: { badge: 'Good fit', badgeClass: 'bg-blue-500/15 text-blue-400' },
  caution: { badge: 'Caution', badgeClass: 'bg-amber-500/15 text-amber-400' },
}

// ── Step 6: Algorithm Selection ──────────────────────────────────────────────

function StepAlgorithm() {
  const taskType = useWizardStore(s => s.taskType)
  const selectedAlgorithms = useWizardStore(s => s.selectedAlgorithms)
  const toggleAlgorithm = useWizardStore(s => s.toggleAlgorithm)
  const shape = useWizardStore(s => s.shape)
  const featureColumns = useWizardStore(s => s.featureColumns)

  const algos = taskType === 'classification' ? CLASSIFICATION_ALGOS : taskType === 'regression' ? REGRESSION_ALGOS : CLUSTERING_ALGOS

  const fitOrder: Record<AlgoFit, number> = { recommended: 0, good: 1, caution: 2 }
  const sortedAlgos = [...algos].sort((a, b) => {
    const fitA = getAlgoRecommendation(a.id, shape[0], featureColumns.length).fit
    const fitB = getAlgoRecommendation(b.id, shape[0], featureColumns.length).fit
    return fitOrder[fitA] - fitOrder[fitB]
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Select {taskType === 'classification' ? 'Classification' : 'Regression'} Algorithm{selectedAlgorithms.length !== 1 ? 's' : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by fit for your data ({shape[0]} rows, {featureColumns.length} features).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sortedAlgos.map(a => {
          const selected = selectedAlgorithms.includes(a.id)
          const rec = getAlgoRecommendation(a.id, shape[0], featureColumns.length)
          const style = FIT_STYLES[rec.fit]
          return (
            <button
              key={a.id}
              onClick={() => toggleAlgorithm(a.id)}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all',
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{a.name}</span>
                <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium', style.badgeClass)}>
                  {style.badge}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{rec.reason}</span>
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

function StepBuild({ exportError }: { exportError: string | null }) {
  const store = useWizardStore()
  const algos = store.taskType === 'classification' ? CLASSIFICATION_ALGOS : store.taskType === 'regression' ? REGRESSION_ALGOS : CLUSTERING_ALGOS

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review & Build</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your choices, then build the pipeline or export it directly.
        </p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border text-xs">
        <Row label="Dataset" value={
          store.datasetSource === 'upload'
            ? store.uploadedFileName
            : SAMPLE_DATASETS.find(d => d.id === store.sampleDataset)?.name ?? store.sampleDataset
        } />
        <Row label="Task" value={store.taskType} />
        {store.taskType !== 'clustering' && <Row label="Target" value={store.targetColumn} />}
        <Row label="Features" value={`${store.featureColumns.length} columns`} />
        <Row label="Imputation" value={store.imputeStrategy} />
        <Row label="Encoding" value={store.encodingMethod} />
        <Row label="Scaling" value={store.scalingMethod} />
        <Row label="Outliers" value={store.outlierMethod === 'skip' ? 'No handling' : `${store.outlierMethod.toUpperCase()} → ${store.outlierAction}`} />
        {store.taskType !== 'clustering' && <Row label="Test Size" value={`${Math.round(store.testSize * 100)}%`} />}
        {store.taskType !== 'clustering' && <Row label="Stratify" value={store.stratify ? 'Yes' : 'No'} />}
        <Row
          label="Algorithms"
          value={store.selectedAlgorithms
            .map(id => algos.find(a => a.id === id)?.name ?? id)
            .join(', ')}
        />
      </div>

      {/* Multi-model comparison summary */}
      {store.selectedAlgorithms.length > 1 && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-4 py-3">
          <p className="text-xs font-medium text-cyan-400">
            Model Comparison Mode
          </p>
          <p className="mt-1 text-[10px] text-cyan-400/80">
            {store.selectedAlgorithms.length} models will be trained independently on the same data.
            Each gets its own {store.taskType === 'classification' ? 'classification report, confusion matrix, and ROC curve' : store.taskType === 'regression' ? 'regression report, actual vs predicted, and residual plot' : 'cluster report and visualization'}.
            Compare results side-by-side on the canvas to find the best performer.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {store.selectedAlgorithms.map(id => {
              const name = algos.find(a => a.id === id)?.name ?? id
              return (
                <span key={id} className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-400 font-medium">
                  {name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs text-primary">
          <strong>Build Pipeline</strong> creates a project and auto-executes on canvas.
        </p>
        <p className="mt-1.5 text-xs text-primary/80">
          <strong>Export .py</strong> downloads a standalone Python script.{' '}
          <strong>Export .ipynb</strong> downloads a Google Colab-compatible Jupyter notebook.
        </p>
      </div>

      {exportError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{exportError}</p>
        </div>
      )}
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
  const allCols = state.taskType === 'clustering'
    ? [...state.featureColumns]
    : [...state.featureColumns, state.targetColumn]
  addNode('vrl.core.feature_selector', 'Select Columns', {
    method: 'manual',
    columns: allCols,
    threshold: 0.0,
    correlation_target: null,
  })

  // Derive feature column lists by type (excluding target column)
  const numericFeatures = state.columns
    .filter(c => state.featureColumns.includes(c.name) && c.is_numeric)
    .map(c => c.name)
  const categoricalFeatures = state.columns
    .filter(c => state.featureColumns.includes(c.name) && !c.is_numeric)
    .map(c => c.name)

  // 3. Impute missing values (feature columns only — target must stay untouched)
  addNode('vrl.core.missing_value_imputer', 'Impute', {
    strategy: state.imputeStrategy,
    fill_value: '',
    columns: state.featureColumns,
  })

  // 4. Encode categoricals (feature columns only)
  if (categoricalFeatures.length > 0) {
    addNode('vrl.core.encoder', 'Continuize', {
      method: state.encodingMethod,
      columns: categoricalFeatures,
      drop_first: true,
    })
  }

  // 5. Scale features (numeric feature columns only — never the target)
  if (numericFeatures.length > 0) {
    addNode('vrl.core.feature_scaler', 'Preprocess', {
      method: state.scalingMethod,
      columns: numericFeatures,
    })
  }

  // 6. Outlier handling (if not skipped)
  if (state.outlierMethod !== 'skip') {
    addNode('vrl.core.outlier_handler', 'Outlier Handler', {
      method: state.outlierMethod,
      action: state.outlierAction,
      threshold: state.outlierThreshold,
      columns: numericFeatures,
    })
  }

  // 7. Train/Test Split (skip for clustering)
  let splitterId = ''
  if (state.taskType !== 'clustering') {
    splitterId = addNode('vrl.core.train_test_splitter', 'Data Sampler', {
      test_size: state.testSize,
      random_state: state.randomState,
      stratify: state.stratify,
      target_col: state.targetColumn,
    }, 'split_data_out')
  }

  // 8. Model(s) + evaluation(s)
  const modelStartY = y
  const modelX = x
  const evalXBase = modelX + 320
  // For clustering, we need the last node before the model
  const lastPreprocNodeId = prevNodeId

  state.selectedAlgorithms.forEach((algoId, idx) => {
    const algoList = state.taskType === 'classification' ? CLASSIFICATION_ALGOS : state.taskType === 'regression' ? REGRESSION_ALGOS : CLUSTERING_ALGOS
    const algo = algoList.find(a => a.id === algoId)
    const modelLabel = algo?.name ?? 'Model'

    const col = idx
    const myY = modelStartY + col * gap
    const modelNodeId = `${algoId.replace(/\./g, '_')}-wizard-${Date.now()}-model-${idx}`

    if (state.taskType === 'clustering') {
      // Clustering model: input dataframe_in, output dataframe_out + plot_out
      const params: Record<string, unknown> = { random_state: state.randomState }
      if (algoId.includes('kmeans')) params.n_clusters = 3
      if (algoId.includes('hierarchical')) params.n_clusters = 3
      if (algoId.includes('dbscan')) { params.eps = 0.5; params.min_samples = 5 }

      nodes.push({
        id: modelNodeId,
        type: algoId,
        label: modelLabel,
        position: { x: modelX, y: myY },
        parameters: params,
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: lastPreprocNodeId,
        target: modelNodeId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // Cluster Report
      const reportId = `vrl_core_cluster_report-wizard-${Date.now()}-eval-${idx}`
      nodes.push({
        id: reportId,
        type: 'vrl.core.cluster_report',
        label: 'Cluster Report',
        position: { x: evalXBase, y: myY },
        parameters: {},
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: reportId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })

      // Cluster Visualization
      const vizId = `vrl_core_cluster_visualization-wizard-${Date.now()}-viz-${idx}`
      nodes.push({
        id: vizId,
        type: 'vrl.core.cluster_visualization',
        label: 'Cluster Viz',
        position: { x: evalXBase + 280, y: myY },
        parameters: {},
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: modelNodeId,
        target: vizId,
        sourcePort: 'dataframe_out',
        targetPort: 'dataframe_in',
      })
    } else {
      // Supervised models: classification or regression
      nodes.push({
        id: modelNodeId,
        type: algoId,
        label: modelLabel,
        position: { x: modelX, y: myY },
        parameters: { random_state: state.randomState },
      })
      edges.push({
        id: `edge-wizard-${edgeIdx++}`,
        source: splitterId,
        target: modelNodeId,
        sourcePort: 'split_data_out',
        targetPort: 'split_data_in',
      })

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
    }
  })

  return { version: '1.0', nodes, edges }
}
