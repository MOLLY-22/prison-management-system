export type SecurityLevel = "Low" | "Medium" | "High";

export type TransferStatus =
  | "Pending"
  | "Approved"
  | "In Transit"
  | "Completed"
  | "Cancelled"
  | "Rejected";

export type Transfer = {
  id: number;
  inmateNumber: string;
  inmateName: string;
  originFacility: string;
  destinationFacility: string;
  securityLevel: SecurityLevel;
  reason: string;
  requestDate: string;
  status: TransferStatus;
  requestedBy: string;
  approvedBy: string | null;
  transitDate: string | null;
};

export type TransferAuditEntry = {
  id: number;
  transferId: number;
  action: string;
  performedBy: string;
  date: string;
  details: string;
};
