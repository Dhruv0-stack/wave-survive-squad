import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test")({
  ssr: false,
  component: () => <div style={{ padding: 40, fontSize: 32 }}>client only ok</div>,
});
