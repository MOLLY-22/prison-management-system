import axios from 'axios'

export type CustodyStatus = 'Max Security' | 'Active Sentence' | 'Pre-Trial'
export type Inmate = { id: string; fullName: string; offense: string; warrant: string; block: string; cell: string; status: CustodyStatus; admissionDate: string; arrestingStation: string }
export type Transfer = { id: string; name: string; inmateId: string; court: string; time: string; escort: string }

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL })

export const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') return error.response.data.message as string
  return fallback
}

// Paths are placeholders until the backend contract is known
export const fetchInmates = () => http.get<Inmate[]>('/inmates').then((res) => res.data)
export const createInmate = (payload: Omit<Inmate, 'id'>) => http.post<Inmate>('/inmates', payload).then((res) => res.data)
export const fetchTransfers = () => http.get<Transfer[]>('/transfers').then((res) => res.data)
