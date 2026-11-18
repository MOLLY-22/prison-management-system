import { Alert, Box, Stack, Typography } from "@mui/material";
import "./releaseManagement.css";

export default function ReleaseManagement() {
  return (
    <Box className="module-workspace release-workspace">
      <Stack spacing={3}>
        <Box className="module-heading">
          <Typography className="module-crumb">
            Operations / Release control
          </Typography>
          <Box className="module-heading-row">
            <Box>
              <Typography component="h1">Release &amp; discharge</Typography>
              <Typography>
                Release records must be loaded from and saved by the backend.
              </Typography>
            </Box>
          </Box>
        </Box>
        <Alert severity="warning">
          The backend OpenAPI contract does not currently expose release,
          discharge, or clearance endpoints. This workspace is unavailable;
          no release record is shown as saved.
        </Alert>
      </Stack>
    </Box>
  );
}
