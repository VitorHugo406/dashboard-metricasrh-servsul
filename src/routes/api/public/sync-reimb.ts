import { createFileRoute } from "@tanstack/react-router";
import { refreshReimbursementsFn } from "@/lib/reimb.functions";

export const Route = createFileRoute("/api/public/sync-reimb")({
  server: {
    handlers: {
      GET: async () => {
        const result = await refreshReimbursementsFn();
        return Response.json(result);
      },
      POST: async () => {
        const result = await refreshReimbursementsFn();
        return Response.json(result);
      },
    },
  },
});
