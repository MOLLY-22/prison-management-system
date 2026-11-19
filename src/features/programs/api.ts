import axios from 'axios'
import http from '../../api/axiosClient'
import { collectionFrom, itemFrom } from '../../api/dataContract'

export type RehabilitationProgram = {
  id: number
  name: string
  description: string
  facilitator: string
  startDate: string
  endDate: string
}

export type ProgramEnrollment = {
  id: number
  inmateId: string
  programId: number
  programName: string
  enrollmentDate: string
}

export type ProgramAttendance = {
  id: number
  inmateId: string
  programId: number
  programName: string
  sessionDate: string
  attendanceStatus: 'present' | 'absent'
  remarks: string
}

export const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message
  }
  return fallback
}

const fetchCollection = async <T,>(path: string) => {
  const response = await http.get(path)
  return collectionFrom<T>(response.data)
}

export const createProgram = (
  payload: Omit<RehabilitationProgram, 'id'>,
) =>
  http.post('/programs', payload).then((response) =>
    itemFrom<RehabilitationProgram>(response.data),
  )

export const fetchPrograms = () => fetchCollection<RehabilitationProgram>('/programs')

export const fetchProgramEnrollments = () =>
  fetchCollection<ProgramEnrollment>('/programs/enrollments')

export const createProgramEnrollment = (
  payload: Pick<ProgramEnrollment, 'inmateId' | 'programId' | 'enrollmentDate'>,
) =>
  http.post('/programs/enrollments', payload).then((response) =>
    itemFrom<ProgramEnrollment>(response.data),
  )

export const fetchProgramAttendance = () =>
  fetchCollection<ProgramAttendance>('/programs/attendance')

export const createProgramAttendance = (
  payload: Pick<
    ProgramAttendance,
    'inmateId' | 'programId' | 'sessionDate' | 'attendanceStatus' | 'remarks'
  >,
) =>
  http.post('/programs/attendance', payload).then((response) =>
    itemFrom<ProgramAttendance>(response.data),
  )
