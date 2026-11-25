import { normalizeRole as normalizeRBACRole } from "../config/rbas";

export type Workspace =
  | "overview"
  | "inmates"
  | "visitors"
  | "transfers"
  | "transfer-analytics"
  | "release"
  | "access"
  | "prisons"
  | "housing";

export type RoleProfile = {
  label: string;
  summary: string;
  workspaces: Workspace[];
  primary: Workspace[];
};

const profiles: Record<string, RoleProfile> = {
  "SUPER ADMIN": {
    label: "System administrator",
    summary: "Manage personnel and prison registry actions, with read-only access to inmate and visit records.",
    workspaces: ["overview", "prisons", "access", "inmates", "visitors"],
    primary: ["access", "prisons"],
  },
  "RECORDS OFFICER": {
    label: "Custody records",
    summary: "Maintain inmate records, admissions, sentence details, transfers, and release preparation.",
    workspaces: ["overview", "prisons", "inmates", "transfers", "transfer-analytics", "release", "housing", "visitors"],
    primary: ["inmates", "transfers", "release"],
  },
  "COMMISSIONER": {
    label: "Commissioner",
    summary: "Oversee prisons, custody records, personnel, and transfer coordination.",
    workspaces: ["overview", "prisons", "inmates", "access", "transfers", "transfer-analytics"],
    primary: ["prisons", "inmates", "transfers"],
  },
  "TRANSFER OFFICER": {
    label: "Transfer operations",
    summary: "Coordinate inmate transfers and facility movement across the system.",
    workspaces: ["overview", "prisons", "inmates", "transfers", "transfer-analytics"],
    primary: ["transfers", "inmates"],
  },
  "DISCIPLINARY OFFICER": {
    label: "Conduct and discipline",
    summary: "Review conduct records and submit transfer requests when required.",
    workspaces: ["overview", "transfers"],
    primary: ["transfers"],
  },
  "CASE OFFICER": {
    label: "Case management",
    summary: "Review visit records, create legal visits, and submit transfer requests.",
    workspaces: ["overview", "visitors", "transfers"],
    primary: ["visitors", "transfers"],
  },
  "VISITOR OFFICER": {
    label: "Visits desk",
    summary: "Coordinate visitor appointments and review visit activity.",
    workspaces: ["overview", "visitors"],
    primary: ["visitors"],
  },
  "INSTRUCTOR": {
    label: "Programs and instruction",
    summary: "Record attendance for rehabilitation programs.",
    workspaces: ["overview"],
    primary: [],
  },
  "PROGRAM FACILITATOR": {
    label: "Program facilitation",
    summary: "Manage program enrollment and record rehabilitation attendance.",
    workspaces: ["overview"],
    primary: [],
  },
  "MEDICAL OFFICER": {
    label: "Health services",
    summary: "Review visit records, create health visits, and submit transfer requests.",
    workspaces: ["overview", "visitors", "transfers"],
    primary: ["visitors", "transfers"],
  },
  "DUTY OFFICER": {
    label: "Duty Officer",
    summary: "No operational permissions are assigned to this role.",
    workspaces: ["overview"],
    primary: [],
  },
};

export function normalizeRole(role: string | null | undefined) {
  return normalizeRBACRole(role)?.toUpperCase() ?? "";
}

export function getRoleProfile(role: string | null | undefined): RoleProfile {
  const normalized = normalizeRole(role);
  return profiles[normalized] ?? {
    label: "Unrecognized role",
    summary: "No operational workspace is available until your role is assigned and recognized.",
    workspaces: ["overview"],
    primary: [],
  };
}
