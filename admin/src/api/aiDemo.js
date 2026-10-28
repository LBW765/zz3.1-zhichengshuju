const base = import.meta.env.VITE_AI_BASE_API || '/api/ai'
const tokenKey = 'jian-ai-token'

export const getAiToken = () => sessionStorage.getItem(tokenKey) || ''
export const setAiToken = token => token ? sessionStorage.setItem(tokenKey, token) : sessionStorage.removeItem(tokenKey)

export async function aiRequest(path, options = {}) {
  const token = getAiToken()
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!response.ok) throw new Error(`服务请求失败（${response.status}）`)
  const payload = await response.json()
  if (payload.code !== 200) {
    if (payload.code === 401) setAiToken('')
    const error = new Error(payload.message || '操作失败')
    error.code = payload.code
    throw error
  }
  return payload.data
}

const query = values => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, value) })
  return params.size ? `?${params}` : ''
}

export const aiApi = {
  login: (username, password) => aiRequest('/login', { method: 'POST', body: { username, password } }),
  me: () => aiRequest('/me'),
  logout: () => aiRequest('/logout', { method: 'POST' }),
  portal: () => aiRequest('/portal'),
  search: filters => aiRequest(`/search${query(filters)}`),
  catalog: filters => aiRequest(`/catalog${query(filters)}`),
  catalogDetail: id => aiRequest(`/catalog/${id}`),
  suppliers: filters => aiRequest(`/suppliers${query(filters)}`),
  supplierDetail: id => aiRequest(`/suppliers/${id}`),
  recommend: body => aiRequest('/recommend', { method: 'POST', body }),
  demands: filters => aiRequest(`/demands${query(filters)}`),
  demandDetail: id => aiRequest(`/demands/${id}`),
  createDemand: body => aiRequest('/demands', { method: 'POST', body }),
  matches: id => aiRequest(`/demands/${id}/matches`),
  applications: filters => aiRequest(`/applications${query(filters)}`),
  operationsApplications: filters => aiRequest(`/operations/applications${query(filters)}`),
  applicationDetail: id => aiRequest(`/applications/${id}`),
  createApplication: body => aiRequest('/applications', { method: 'POST', body }),
  async upload(file) {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`${base}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${getAiToken()}` }, body })
    if (!response.ok) throw new Error(`上传失败（${response.status}）`)
    const payload = await response.json()
    if (payload.code !== 200) throw new Error(payload.message || '上传失败')
    return payload.data
  },
  attachmentUrl: id => `${base}/uploads/${id}`,
  async downloadAttachment(id, name) {
    const response = await fetch(`${base}/uploads/${id}`, { headers: { Authorization: `Bearer ${getAiToken()}` } })
    if (!response.ok) throw new Error('附件下载失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name || '附件'
    link.click()
    URL.revokeObjectURL(url)
  },
  resubmit: (id, description) => aiRequest(`/applications/${id}/resubmit`, { method: 'PATCH', body: { description } }),
  updateStatus: (id, status, note) => aiRequest(`/operations/applications/${id}/status`, { method: 'PATCH', body: { status, note } }),
  overview: () => aiRequest('/government/overview'),
  projects: filters => aiRequest(`/government/projects${query(filters)}`)
}
