import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/roles/$jobId")({
  beforeLoad: () => { throw redirect({ to: "/check" }); },
});
