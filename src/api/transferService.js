
import api from './axios'

const BASE_PATH = ''

function buildQuery(filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    const values = Array.isArray(value) ? value : [value]
    values.forEach(item => {
      if (item !== undefined && item !== null && item !== '') {
        params.append(key, String(item))
      }
    })
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const transferService = {
  getTransfers: async (filters = {}) => {
    const response = await api.get(
      `${BASE_PATH}/transfers${buildQuery(filters)}`,
    )
    return response.data
  },

  createTransfer: async (transferData) => {
    const response = await api.post(`${BASE_PATH}/transfers`, transferData)
    return response.data
  },

  approveTransfer: async (transferId, approvalData) => {
    const response = await api.post(
      `${BASE_PATH}/transfers/${encodeURIComponent(transferId)}/approve`,
      approvalData,
    )
    return response.data
  },

  rejectTransfer: async (transferId, data = {}) => {
    const response = await api.post(
      `${BASE_PATH}/transfers/${encodeURIComponent(transferId)}/reject`,
      data,
    )
    return response.data
  },

  cancelTransfer: async (transferId, data = {}) => {
    const response = await api.post(
      `${BASE_PATH}/transfers/${encodeURIComponent(transferId)}/cancel`,
      data,
    )
    return response.data
  },

  getInmates: async (filters = {}) => {
    const response = await api.get(`${BASE_PATH}/inmates${buildQuery(filters)}`)
    return response.data
  },

  getPrisons: async (filters = {}) => {
    const response = await api.get(`${BASE_PATH}/prisons${buildQuery(filters)}`)
    return response.data
  },

  getCells: async (filters = {}) => {
    const response = await api.get(`${BASE_PATH}/cells${buildQuery(filters)}`)
    return response.data
  },
}
