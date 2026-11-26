export function resolveCellAvailability(
  capacity: number,
  occupancy: number,
  reportedAvailable?: number,
): number {
  const safeCapacity = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 0;
  const safeOccupancy = Number.isFinite(occupancy) ? Math.max(0, Math.floor(occupancy)) : 0;
  const computed = Math.max(0, safeCapacity - safeOccupancy);
  if (reportedAvailable === undefined || !Number.isFinite(reportedAvailable)) return computed;
  return Math.max(0, Math.min(computed, Math.floor(reportedAvailable)));
}
