import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tv")({
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
