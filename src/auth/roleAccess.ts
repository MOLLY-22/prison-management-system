export type Workspace =
  | "overview"
  | "inmates"
  | "visitors"
  | "transfers"
  | "release"
  | "access"
  | "prisons";

export type RoleProfile = {
  label: string;
  summary: string;
  workspaces: Workspace[];
  primary: Workspace[];
  canAdmit: boolean;
  canManagePrisons: boolean;
};

const allOperational: Workspace[] = [
  "overview", "inmates", "visitors", "transfers", "release", "access", "prisons",
];

const profiles: Record<string, RoleProfile> = {
  "SUPER ADMIN": {
    label: "System administrator",
    summary: "Manage personnel access, facility configuration, and system wide custody operations.",
    workspaces: allOperational,
    primary: ["access", "prisons", "inmates"],
    canAdmit: false,
    canManagePrisons: true,
  },
  "RECORDS OFFICER": {
    label: "Custody records",
    summary: "Maintain inmate records, admissions, sentence details, transfers, and release preparation.",
    workspaces: ["overview", "inmates", "transfers", "release"],
    primary: ["inmates", "transfers", "release"],
    canAdmit: true,
    canManagePrisons: false,
  },
  "DISCIPLINARY OFFICER": {
    label: "Conduct and discipline",
    summary: "Review inmate profiles and record or follow up on conduct incidents.",
    workspaces: ["overview", "inmates"],
    primary: ["inmates"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "CASE OFFICER": {
    label: "Case management",
    summary: "Track inmate cases, sentence information, transfers, and release eligibility.",
    workspaces: ["overview", "inmates", "transfers", "release"],
    primary: ["inmates", "transfers", "release"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "VISITOR OFFICER": {
    label: "Visits desk",
    summary: "Coordinate visitor appointments and review visit activity.",
    workspaces: ["overview", "visitors"],
    primary: ["visitors"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "REHABILITATION OFFICER": {
    label: "Rehabilitation services",
    summary: "Review inmate profiles and support rehabilitation program participation.",
    workspaces: ["overview", "inmates"],
    primary: ["inmates"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "INSTRUCTOR": {
    label: "Programs and instruction",
    summary: "Review assigned inmate profiles and record program attendance.",
    workspaces: ["overview", "inmates"],
    primary: ["inmates"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "MEDICAL OFFICER": {
    label: "Health services",
    summary: "Review inmate records relevant to health services and care coordination.",
    workspaces: ["overview", "inmates"],
    primary: ["inmates"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "DUTY OFFICER": {
    label: "Facility operations",
    summary: "Coordinate daily facility activity, inmate movements, and visit operations.",
    workspaces: ["overview", "inmates", "visitors", "transfers"],
    primary: ["transfers", "visitors", "inmates"],
    canAdmit: false,
    canManagePrisons: false,
  },
  "OFFICER IN CHARGE": {
    label: "Facility leadership",
    summary: "Oversee facility custody operations, transfers, and release authorization.",
    workspaces: ["overview", "inmates", "visitors", "transfers", "release", "prisons"],
    primary: ["release", "transfers", "inmates"],
    canAdmit: false,
    canManagePrisons: true,
  },
  "PRISON OFFICER": {
    label: "Custody operations",
    summary: "Review inmate custody records and coordinate daily movement and visits.",
    workspaces: ["overview", "inmates", "visitors", "transfers"],
    primary: ["inmates", "transfers", "visitors"],
    canAdmit: false,
    canManagePrisons: false,
  },
};

export function normalizeRole(role: string | null | undefined) {
  return (role ?? "")
    .trim()
    .replace(/^ROLE_/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function getRoleProfile(role: string | null | undefined): RoleProfile {
  const normalized = normalizeRole(role);
  if (["ADMIN", "ADMINISTRATOR", "SYSTEM ADMIN", "SYSTEM ADMINISTRATOR"].includes(normalized)) {
    return profiles["SUPER ADMIN"];
  }
  return profiles[normalized] ?? {
    label: "Authorized officer",
    summary: "Your role could not be matched to a staff profile. Available operational workspaces are shown below.",
    workspaces: allOperational,
    primary: ["inmates", "visitors", "transfers", "release", "access", "prisons"],
    canAdmit: true,
    canManagePrisons: true,
  };
}
