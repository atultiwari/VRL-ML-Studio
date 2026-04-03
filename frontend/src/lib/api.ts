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
