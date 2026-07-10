import { createFileRoute, redirect } from "@tanstack/react-router";

// Drivers are now managed inside Fleet Management (/trucks tab)
export const Route = createFileRoute("/drivers")({
  beforeLoad: () => {
    throw redirect({ to: "/trucks" });
  },
  component: () => null,
});
