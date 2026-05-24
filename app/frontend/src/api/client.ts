// Wrapper fetch sobre o prefixo /api. As funções de domínio (reports/copilot)
// decidem cair para fixtures quando o backend não responde.

const BASE = '/api'

/** true quando o build pediu fixtures explicitamente (VITE_USE_FIXTURES=1). */
export const FORCE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === '1'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return fetch(`${BASE}${path}`, { signal }).then((r) => parse<T>(r))
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => parse<T>(r))
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => parse<T>(r))
}

/** URL absoluta para download direto (export .docx). */
export function apiUrl(path: string): string {
  return `${BASE}${path}`
}
