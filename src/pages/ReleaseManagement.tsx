import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import DischargeClearanceList from "../components/DischargeClearanceChecklist";
import DischargeEventRecording from "../components/DischargeEventRecording";
import ReleaseEligibilityQueueDashboard from "../components/ReleaseEligibilityQueueDashboard";
import TableData from "../components/TableData";
import type { TableDataColumn } from "../components/TableData";
import { useAuth } from "../context/AuthContext.tsx";
import {
  releaseDischargeService,
  type InmateRecord,
} from "../api/releaseAndDischargeService";
import "./releaseManagement.css";

type EligibilityStatus = "all" | "progress" | "ready" | "hold";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load inmate records.";
}

function inmateName(inmate: InmateRecord | undefined) {
  if (!inmate) return "";
  const name = inmate.fullName ?? inmate.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return [
    inmate.firstName,
    inmate.lastName,
  ].filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(" ");
}

function inmateValue(inmate: InmateRecord, keys: string[]) {
  const value = inmateText(inmate, keys);
  return value || "Not provided";
}

function inmateText(inmate: InmateRecord, keys: string[]) {
  for (const key of keys) {
    const value = inmate[key];
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function eligibilityType(inmate: InmateRecord): EligibilityStatus | "unknown" {
  const status = inmateText(inmate, [
    "releaseEligibilityStatus",
    "eligibilityStatus",
    "clearanceStatus",
  ]).toUpperCase().replace(/[\s-]+/g, "_");
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

function eligibilityLabel(inmate: InmateRecord) {
  const value = inmateText(inmate, [
    "releaseEligibilityStatus",
    "eligibilityStatus",
    "clearanceStatus",
  ]);
  if (value) return value;
  const type = eligibilityType(inmate);
  return type === "unknown" ? "Not assessed" : type.replace("_", " ");
}

export default function ReleaseManagement() {
  const { can } = useAuth();
  const canReadInmates = can("inmates:read");
  const canManageInmates = can("inmates:manage");
  const [inmates, setInmates] = useState<InmateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus>("all");
  const [selectedInmateId, setSelectedInmateId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const fetchInmates = useCallback(async () => {
    if (!canReadInmates) return [];
    console.log("Fetching inmate records from API...");
    const records = await releaseDischargeService.getAllInmates();
    if (!Array.isArray(records)) {
      throw new TypeError("The inmate API returned an unexpected response.");
    }
    return records;
  }, [canReadInmates]);

  useEffect(() => {
    if (!canReadInmates) return;
    let active = true;
    fetchInmates()
      .then((records) => {
        if (!active) return;
        setInmates(records);
        setSelectedInmateId((current) =>
          records.some((inmate) => String(inmate.id) === current) ? current : "",
        );
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageFrom(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canReadInmates, fetchInmates]);

  const refreshInmates = async () => {
    if (!canReadInmates) return;
    setLoading(true);
    setLoadError("");
    try {
      const records = await fetchInmates();
      setInmates(records);
      setSelectedInmateId((current) =>
        records.some((inmate) => String(inmate.id) === current) ? current : "",
      );
    } catch (error: unknown) {
      setLoadError(messageFrom(error));
    } finally {
      setLoading(false);
    }
  };

  const selectedInmate = useMemo(
    () => inmates.find((inmate) => String(inmate.id) === selectedInmateId),
    [inmates, selectedInmateId],
  );

  const readyCount = inmates.filter((inmate) => eligibilityType(inmate) === "ready").length;
  const holdCount = inmates.filter((inmate) => eligibilityType(inmate) === "hold").length;
  const filteredInmates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inmates.filter((inmate) => {
      const status = eligibilityType(inmate);
      const searchable = [
        String(inmate.id),
        inmateName(inmate),
        inmateText(inmate, ["prisonName", "prison_name", "blockName", "block_name", "cellId", "cell_id"]),
        eligibilityLabel(inmate),
      ].join(" ").toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (eligibilityStatus === "all" || status === eligibilityStatus)
      );
    });
  }, [eligibilityStatus, inmates, search]);

  const columns: TableDataColumn<InmateRecord>[] = [
    {
      key: "inmate",
      title: "Inmate",
      render: (inmate) => (
        <span className="person-chip">
          <strong>{inmateName(inmate) || "Name unavailable"}</strong>
        </span>
      ),
    },
    {
      key: "placement",
      title: "Placement",
      render: (inmate) => (
        <span className="muted">
          {[
            inmateText(inmate, ["prisonName", "prison_name"]),
            inmateText(inmate, ["blockName", "block_name", "cellName", "cell_name", "cellId", "cell_id"]),
          ].filter(Boolean).join(" · ") || "Not provided"}
        </span>
      ),
    },
    {
      key: "projectedRelease",
      title: "Projected release",
      render: (inmate) => inmateValue(inmate, [
        "projectedReleaseDate",
        "expectedReleaseDate",
        "sentenceExpiry",
        "sentenceEndDate",
        "sentence_end_date",
      ]),
    },
    {
      key: "remission",
      title: "Remission",
      render: (inmate) => inmateValue(inmate, ["remissionDays", "remission_days", "remission"]),
    },
    {
      key: "eligibility",
      title: "Clearance status",
      render: (inmate) => {
        const status = eligibilityType(inmate);
        const color = status === "hold" ? " is-inactive" : "";
        return <span className={`status-pill${color}`}>{eligibilityLabel(inmate)}</span>;
      },
    },
  ];

  if (!canReadInmates) {
    return (
      <Alert severity="warning">
        Your role does not have permission to view inmate release records.
      </Alert>
    );
  }

  return (
    <Box className="module-workspace release-workspace">
      <Stack spacing={1}>
        <Box className="module-heading">
          <Typography className="module-crumb">
            Operations / Release control
          </Typography>
          <Box className="module-heading-row">
            <Box>
              <Typography component="h1">Release &amp; discharge</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => void refreshInmates()}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh inmates"}
              </Button>
              {canManageInmates && (
                <Button
                  variant="contained"
                  onClick={() => setEventDialogOpen(true)}
                  disabled={inmates.length === 0}
                >
                  Record discharge event
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {loadError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refreshInmates()}>
                Retry
              </Button>
            }
          >
            Could not load inmate records: {loadError}
          </Alert>
        )}

        <Box className="module-metrics">
          <Box className="module-metric">
            <p>Inmate records</p>
            <strong>{loading ? "…" : inmates.length}</strong>
          </Box>
          <Box className="module-metric">
            <p>Ready for authorization</p>
            <strong>{loading ? "…" : readyCount}</strong>
          </Box>
          <Box className="module-metric">
            <p>On hold</p>
            <strong>{loading ? "…" : holdCount}</strong>
          </Box>
        </Box>

        <ReleaseEligibilityQueueDashboard
          search={search}
          setSearch={setSearch}
          eligibilityStatus={eligibilityStatus}
          setEligibilityStatus={setEligibilityStatus}
        />

        <TableData
          header="Release eligibility queue"
          description="Review inmate placement, projected release details, and clearance status."
          columns={columns}
          rows={filteredInmates}
          loading={loading}
          loadingMessage="Loading inmate records…"
          emptyMessage={
            loadError
              ? "Inmate records could not be loaded."
              : "No inmates match the current search or status filter."
          }
          ariaLabel="Inmate release eligibility"
          footer={`Showing ${filteredInmates.length} of ${inmates.length} inmate records`}
          actions={{
            title: "Action",
            render: (inmate) => (
              <button
                type="button"
                onClick={() => {
                  setSelectedInmateId(String(inmate.id));
                  setDetailsOpen(true);
                }}
              >
                Review
              </button>
            ),
          }}
        />

        <Dialog
          open={detailsOpen && Boolean(selectedInmate)}
          onClose={() => setDetailsOpen(false)}
          fullWidth
          maxWidth="md"
          aria-labelledby="release-details-title"
        >
          <DialogTitle id="release-details-title">
            Release details · {inmateName(selectedInmate)}
          </DialogTitle>
          <DialogContent dividers>
            {selectedInmate && (
              <Stack spacing={2.5}>
                <TableContainer>
                  <Table size="small" aria-label="Inmate release details">
                    <TableBody>
                      {[
                        ["Inmate ID", String(selectedInmate.id)],
                        ["Inmate number", inmateValue(selectedInmate, ["inmateNumber", "inmate_number", "fileNumber"])],
                        ["Facility", inmateValue(selectedInmate, ["prisonName", "prison_name"])],
                        ["Cell / block", inmateValue(selectedInmate, ["cellName", "cell_name", "cellId", "cell_id", "blockName", "block_name"])],
                        ["Projected release", inmateValue(selectedInmate, ["projectedReleaseDate", "expectedReleaseDate", "sentenceExpiry", "sentenceEndDate", "sentence_end_date"])],
                        ["Remission", inmateValue(selectedInmate, ["remissionDays", "remission_days", "remission"])],
                        ["Eligibility status", inmateValue(selectedInmate, ["releaseEligibilityStatus", "eligibilityStatus", "clearanceStatus"])],
                      ].map(([label, value]) => (
                        <TableRow key={label}>
                          <TableCell sx={{ width: "34%", fontWeight: 700 }}>{label}</TableCell>
                          <TableCell>{value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <DischargeClearanceList
                  key={selectedInmateId}
                  inmateId={selectedInmateId}
                  inmateName={inmateName(selectedInmate)}
                  canManage={canManageInmates}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {canManageInmates && <Dialog
          open={eventDialogOpen}
          onClose={() => setEventDialogOpen(false)}
          fullWidth
          maxWidth="md"
          scroll="paper"
          aria-labelledby="discharge-event-dialog-title"
        >
          <DialogTitle id="discharge-event-dialog-title">
            Record discharge event
          </DialogTitle>
          <DialogContent dividers sx={{ p: 2 }}>
            <DischargeEventRecording
              inmates={inmates}
              selectedInmateId={selectedInmateId}
              onSelectInmate={setSelectedInmateId}
              showHeader={false}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEventDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>}
      </Stack>
    </Box>
  );
}
