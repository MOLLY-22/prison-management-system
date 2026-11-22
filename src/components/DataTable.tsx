import { useMemo } from "react";
import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { InmateRecord } from "../api/releaseAndDischargeService";

type Eligibility = "progress" | "ready" | "hold" | "unknown";

type DataTableProps = {
  records: InmateRecord[];
  search?: string;
  eligibilityStatus?: "all" | "progress" | "ready" | "hold";
  onSelectInmate: (inmate: InmateRecord) => void;
};

function textValue(record: InmateRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function inmateName(inmate: InmateRecord) {
  return textValue(
    inmate,
    ["fullName", "name"],
    [textValue(inmate, ["firstName", "first_name"]), textValue(inmate, ["lastName", "last_name"])]
      .filter(Boolean)
      .join(" "),
  ) || "Name unavailable";
}

function eligibility(inmate: InmateRecord): Eligibility {
  const status = textValue(
    inmate,
    ["releaseEligibilityStatus", "eligibilityStatus", "clearanceStatus", "releaseStatus"],
  ).toUpperCase().replace(/[\s-]+/g, "_");

  if (["READY", "ELIGIBLE", "READY_FOR_RELEASE", "READY_FOR_AUTHORIZATION"].includes(status)) {
    return "ready";
  }
  if (["HOLD", "ON_HOLD", "BLOCKED", "INELIGIBLE"].includes(status)) {
    return "hold";
  }
  if (["IN_PROGRESS", "PENDING", "UNDER_REVIEW"].includes(status)) {
    return "progress";
  }
  return "unknown";
}

function displayDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const statusLabels: Record<Eligibility, string> = {
  progress: "In progress",
  ready: "Ready",
  hold: "On hold",
  unknown: "Not assessed",
};

const statusColors: Record<Eligibility, "warning" | "success" | "error" | "default"> = {
  progress: "warning",
  ready: "success",
  hold: "error",
  unknown: "default",
};

export default function DataTable({
  records,
  search = "",
  eligibilityStatus = "all",
  onSelectInmate,
}: DataTableProps) {
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((inmate) => {
      const id = String(inmate.id);
      const name = inmateName(inmate);
      const placement = textValue(inmate, ["prisonName", "prison_name", "blockName", "cellId"]);
      const status = eligibility(inmate);
      return (
        (!query || `${id} ${name} ${placement} ${statusLabels[status]}`.toLowerCase().includes(query)) &&
        (eligibilityStatus === "all" || status === eligibilityStatus)
      );
    });
  }, [eligibilityStatus, records, search]);

  return (
    <Paper className="module-directory" variant="outlined">
      <div className="module-directory-title">
        <Typography component="h2">Release eligibility queue</Typography>
        <Typography>
          Eligibility and sentence details are shown when provided by the inmate API.
        </Typography>
      </div>
      <TableContainer>
        <Table size="small" aria-label="Inmate release eligibility">
          <TableHead>
            <TableRow>
              <TableCell>Inmate</TableCell>
              <TableCell>Placement</TableCell>
              <TableCell>Projected release</TableCell>
              <TableCell>Remission</TableCell>
              <TableCell>Clearance status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.map((inmate) => {
              const status = eligibility(inmate);
              const id = String(inmate.id);
              const placement = [
                textValue(inmate, ["prisonName", "prison_name"]),
                textValue(inmate, ["blockName", "block_name", "cellName", "cell_name", "cellId", "cell_id"]),
              ].filter(Boolean).join(" · ");

              return (
                <TableRow key={id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {inmateName(inmate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {textValue(inmate, ["inmateNumber", "inmate_number", "fileNumber"], id)}
                    </Typography>
                  </TableCell>
                  <TableCell>{placement || "—"}</TableCell>
                  <TableCell>
                    {displayDate(textValue(inmate, [
                      "projectedReleaseDate",
                      "expectedReleaseDate",
                      "sentenceExpiry",
                      "sentenceEndDate",
                      "sentence_end_date",
                    ]))}
                  </TableCell>
                  <TableCell>
                    {textValue(inmate, ["remissionDays", "remission_days", "remission"], "—")}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColors[status]}
                      label={textValue(inmate, [
                        "releaseEligibilityStatus",
                        "eligibilityStatus",
                        "clearanceStatus",
                        "releaseStatus",
                      ], statusLabels[status])}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => onSelectInmate(inmate)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  No inmates match the current search or status filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
