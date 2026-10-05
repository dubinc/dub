// POST /api/partners/applications/reject – Reject a pending partner application
// @deprecated Use POST /api/program-applications/reject instead. Kept for existing API/SDK clients.
export { POST } from "../../../program-applications/reject/route";
