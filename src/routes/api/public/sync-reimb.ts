import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sync-reimb")({
  server: {
    handlers: {
      GET: async () => {
        const { refreshReimbursements } = await import("@/lib/reimb-sync.server");
        const result = await refreshReimbursements();
        return Response.json(result);
      },
      POST: async () => {
        const { refreshReimbursements } = await import("@/lib/reimb-sync.server");
        const result = await refreshReimbursements();
        return Response.json(result);
      },
    },
  },
});
