<Box className="module-workspace transfer-workspace">
  <Stack spacing={3}>
    <Box
      className="module-heading"
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: '#64748b',
            fontWeight: 700,
            letterSpacing: 1.4,
          }}
        >
          OPERATIONS / TRANSFERS
        </Typography>

        <Typography
          component="h1"
          sx={{
            mt: 0.5,
            color: '#172033',
            fontWeight: 750,
            fontSize: { xs: '1.65rem', md: '2rem' },
          }}
        >
          Transfer Management
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color: '#64748b',
            maxWidth: 720,
            fontSize: '0.95rem',
          }}
        >
          Manage transfer requests, review approvals, track inmate movements
          and inspect the transfer audit history.
        </Typography>
      </Box>

      <Chip
        label="DEMO MODE"
        size="small"
        sx={{
          fontWeight: 700,
          color: '#475569',
          backgroundColor: '#e2e8f0',
          borderRadius: 1,
        }}
      />
    </Box>