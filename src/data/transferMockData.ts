
export type TransferStatus =
  | 'Pending'
  | 'Approved'
  | 'In Transit'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'

export type SecurityLevel = 'Low' | 'Medium' | 'High'

export interface Transfer {
  id: number
  inmateNumber: string
  inmateName: string
  originFacility: string
  destinationFacility: string
  securityLevel: SecurityLevel
  reason: string
  requestDate: string
  status: TransferStatus
  requestedBy: string
  approvedBy: string | null
  transitDate: string | null
}

export interface TransferAuditEntry {
  id: number
  transferId: number
  action: string
  performedBy: string
  date: string
  details: string
}

export const mockTransfers: Transfer[] = [
  {
    id: 1,
    inmateNumber: 'INM-1042',
    inmateName: 'John Banda',
    originFacility: 'Zomba Central Prison',
    destinationFacility: 'Maula Prison',
    securityLevel: 'High',
    reason: 'Security reassessment',
    requestDate: '2026-10-10',
    status: 'Pending',
    requestedBy: 'Officer Moyo',
    approvedBy: null,
    transitDate: null,
  },
  {
    id: 2,
    inmateNumber: 'INM-1088',
    inmateName: 'Peter Phiri',
    originFacility: 'Maula Prison',
    destinationFacility: 'Zomba Central Prison',
    securityLevel: 'Medium',
    reason: 'Court attendance and relocation',
    requestDate: '2026-10-08',
    status: 'Approved',
    requestedBy: 'Officer Banda',
    approvedBy: 'Officer Chirwa',
    transitDate: '2026-10-15',
  },
  {
    id: 3,
    inmateNumber: 'INM-1105',
    inmateName: 'Grace Nkhoma',
    originFacility: 'Zomba Central Prison',
    destinationFacility: 'Chichiri Prison',
    securityLevel: 'Low',
    reason: 'Facility capacity management',
    requestDate: '2026-10-02',
    status: 'Completed',
    requestedBy: 'Officer Mbewe',
    approvedBy: 'Officer Chirwa',
    transitDate: '2026-10-06',
  },
  {
    id: 4,
    inmateNumber: 'INM-1120',
    inmateName: 'David Zulu',
    originFacility: 'Chichiri Prison',
    destinationFacility: 'Maula Prison',
    securityLevel: 'Medium',
    reason: 'Transfer request withdrawn',
    requestDate: '2026-10-01',
    status: 'Cancelled',
    requestedBy: 'Officer Phiri',
    approvedBy: null,
    transitDate: null,
  },
  {
    id: 5,
    inmateNumber: 'INM-1151',
    inmateName: 'Michael Jere',
    originFacility: 'Maula Prison',
    destinationFacility: 'Chichiri Prison',
    securityLevel: 'High',
    reason: 'Approved facility relocation',
    requestDate: '2026-10-09',
    status: 'In Transit',
    requestedBy: 'Officer Moyo',
    approvedBy: 'Officer Chirwa',
    transitDate: '2026-10-12',
  },
]

export const mockTransferAudit: TransferAuditEntry[] = [
  {
    id: 1,
    transferId: 1,
    action: 'Transfer requested',
    performedBy: 'Officer Moyo',
    date: '2026-10-10 09:15',
    details: 'Transfer request submitted for review.',
  },
  {
    id: 2,
    transferId: 2,
    action: 'Transfer approved',
    performedBy: 'Officer Chirwa',
    date: '2026-10-09 11:30',
    details: 'Request approved for scheduled movement.',
  },
  {
    id: 3,
    transferId: 3,
    action: 'Transfer completed',
    performedBy: 'Officer Chirwa',
    date: '2026-10-06 14:00',
    details: 'Arrival at destination facility recorded.',
  },
]
