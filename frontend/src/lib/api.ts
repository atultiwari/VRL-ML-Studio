import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message: string =
      error.response?.data?.detail ?? error.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export async function checkHealth(): Promise<{
  status: string
  version: string
  nodes_loaded: number
}> {
  const { data } = await api.get('/health')
  return data
}

export async function getNodes(): Promise<import('./types').NodeManifestWithUI[]> {
  const { data } = await api.get('/nodes')
  return data
}

export async function exportPython(
  pipeline: import('./types').PipelineJSON,
  pipelineName: string,
): Promise<Blob> {
  const { data } = await api.post('/export/python', {
    pipeline,
    pipeline_name: pipelineName,
  }, { responseType: 'blob' })
  return data
}

export async function exportNotebook(
  pipeline: import('./types').PipelineJSON,
  pipelineName: string,
): Promise<Blob> {
  const { data } = await api.post('/export/notebook', {
    pipeline,
    pipeline_name: pipelineName,
  }, { responseType: 'blob' })
  return data
}

export async function importNodePackage(
  file: File,
  projectPath?: string,
): Promise<{ id: string; name: string; version: string; category: string }> {
  const form = new FormData()
  form.append('file', file)
  const params = projectPath ? `?project_path=${encodeURIComponent(projectPath)}` : ''
  const { data } = await api.post(`/nodes/import${params}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}

export async function exportNodePackage(nodeId: string): Promise<Blob> {
  const { data } = await api.get(`/nodes/export/${nodeId}`, { responseType: 'blob' })
  return data
}
