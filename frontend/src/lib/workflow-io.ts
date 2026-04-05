import type { NodeManifestWithUI, PipelineJSON, WorkflowExportJSON } from '@/lib/types'

export interface ImportResult {
  pipeline: PipelineJSON
  name: string
  missingNodeTypes: string[]
}

/**
 * Parse and validate a .vrlflow file, returning the pipeline and any warnings.
 * Throws on invalid format. Returns missing node types so the caller can warn.
 */
export function parseWorkflowFile(
  raw: string,
  availableManifests: NodeManifestWithUI[],
): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid file: not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid file: expected a JSON object')
  }

  const obj = parsed as Record<string, unknown>

  // Accept both the .vrlflow envelope and bare PipelineJSON
  if (obj.format === 'vrl-ml-studio-workflow') {
    return parseEnvelope(obj as unknown as WorkflowExportJSON, availableManifests)
  }

  // Fallback: try bare PipelineJSON (e.g. a pipeline.json from a project)
  if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) {
    const pipeline = obj as unknown as PipelineJSON
    return validatePipeline(pipeline, 'Imported Workflow', availableManifests)
  }

  throw new Error('Unrecognized file format. Expected a .vrlflow or pipeline.json file.')
}

function parseEnvelope(
  envelope: WorkflowExportJSON,
  availableManifests: NodeManifestWithUI[],
): ImportResult {
  if (!envelope.pipeline || !Array.isArray(envelope.pipeline.nodes)) {
    throw new Error('Invalid .vrlflow file: missing pipeline data')
  }

  // format_version compatibility — we support "1.0" and future minor versions (1.x)
  const majorVersion = parseInt(String(envelope.format_version).split('.')[0], 10)
  if (isNaN(majorVersion) || majorVersion > 1) {
    throw new Error(
      `This workflow was created with a newer format (v${envelope.format_version}). ` +
      'Please update VRL ML Studio to import it.',
    )
  }

  return validatePipeline(
    envelope.pipeline,
    envelope.name || 'Imported Workflow',
    availableManifests,
  )
}

function validatePipeline(
  pipeline: PipelineJSON,
  name: string,
  availableManifests: NodeManifestWithUI[],
): ImportResult {
  const availableIds = new Set(availableManifests.map(m => m.id))
  const usedTypes = [...new Set(pipeline.nodes.map(n => n.type))]
  const missingNodeTypes = usedTypes.filter(t => !availableIds.has(t))

  return { pipeline, name, missingNodeTypes }
}

/**
 * Opens a file picker for .vrlflow / .json files and returns the file contents.
 */
export function pickWorkflowFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.vrlflow,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    // Handle cancel (no file picked)
    input.oncancel = () => reject(new Error('No file selected'))
    input.click()
  })
}
