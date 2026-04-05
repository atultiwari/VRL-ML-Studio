import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send tenant cookie with every request
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

export interface TenantInfo {
  tenant_id: string
  workspace_name: string
}

export async function getTenantInfo(): Promise<TenantInfo> {
  const { data } = await api.get<TenantInfo>('/tenant/info')
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

export interface DatasetColumnInfo {
  name: string
  dtype: string
  missing: number
  unique: number
  is_numeric: boolean
}

export interface DatasetPreviewResponse {
  columns: DatasetColumnInfo[]
  column_names: string[]
  shape: [number, number]
  preview: unknown[][]
}

export async function datasetPreview(
  dataset: string,
  filePath?: string,
): Promise<DatasetPreviewResponse> {
  const body: Record<string, string> = { dataset }
  if (filePath) body.file_path = filePath
  const { data } = await api.post<DatasetPreviewResponse>('/dataset/preview', body)
  return data
}

// ── Admin API ───────────────────────────────────────────────────────────────

export async function adminCheckEnabled(): Promise<{ enabled: boolean }> {
  const { data } = await api.get('/admin/enabled')
  return data
}

export async function adminCheckSession(): Promise<{ authenticated: boolean }> {
  const { data } = await api.get('/admin/session')
  return data
}

export async function adminLogin(username: string, password: string): Promise<void> {
  await api.post('/admin/login', { username, password })
}

export async function adminLogout(): Promise<void> {
  await api.post('/admin/logout')
}

export interface AdminProject {
  tenant_id: string
  display_name: string
  project_name: string
  name: string
  description: string
  tags: string[]
  node_count: number
  created_at: string
  last_modified: string
}

export async function adminListProjects(tenantId?: string): Promise<AdminProject[]> {
  const params = tenantId ? { tenant_id: tenantId } : {}
  const { data } = await api.get('/admin/projects', { params })
  return data
}

export interface AdminWorkspace {
  tenant_id: string
  display_name: string
  project_count: number
}

export async function adminListWorkspaces(): Promise<AdminWorkspace[]> {
  const { data } = await api.get('/admin/workspaces')
  return data
}

export async function adminDownloadProject(tenantId: string, projectName: string): Promise<Blob> {
  const { data } = await api.get(`/admin/projects/${tenantId}/${projectName}/download`, {
    responseType: 'blob',
  })
  return data
}

export async function adminBulkDownload(
  projects: Array<{ tenant_id: string; project_name: string }>,
): Promise<Blob> {
  const { data } = await api.post('/admin/projects/bulk-download', { projects }, {
    responseType: 'blob',
    timeout: 120_000,
  })
  return data
}

export async function adminDeleteProject(tenantId: string, projectName: string): Promise<void> {
  await api.delete(`/admin/projects/${tenantId}/${projectName}`)
}

export async function adminBulkDelete(
  projects: Array<{ tenant_id: string; project_name: string }>,
): Promise<{ deleted: string[]; errors: Array<{ project: string; error: string }> }> {
  const { data } = await api.post('/admin/projects/bulk-delete', { projects })
  return data
}

export async function uploadFile(file: File): Promise<{ path: string; name: string; size: number }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}
