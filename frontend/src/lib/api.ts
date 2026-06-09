import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,  // send httpOnly cookies (refreshToken)
})

let csrfToken: string | null = null
let refreshPromise: Promise<string> | null = null

// Fetch and cache CSRF token
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const res = await axios.get(`${BASE_URL}/api/csrf-token`, { withCredentials: true })
  csrfToken = res.data.csrfToken
  return csrfToken!
}

// Invalidate cached CSRF token (e.g. after refresh)
export function clearCsrfToken() {
  csrfToken = null
}

// Attach CSRF header to mutating requests
api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase()
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['x-csrf-token'] = await getCsrfToken()
  }
  // Attach access token from memory store if available
  const token = getAccessToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Silent refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const newToken = await silentRefresh()
        original.headers['Authorization'] = `Bearer ${newToken}`
        clearCsrfToken()  // get a fresh CSRF token after refresh
        return api(original)
      } catch {
        // refresh failed — clear auth state
        clearAccessToken()
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

async function silentRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise
  refreshPromise = axios
    .post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const token = res.data.accessToken
      setAccessToken(token)
      return token
    })
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

// In-memory access token (never touches localStorage for security)
let _accessToken: string | null = null
export const getAccessToken  = () => _accessToken
export const setAccessToken  = (t: string) => { _accessToken = t }
export const clearAccessToken = () => { _accessToken = null }
