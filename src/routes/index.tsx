import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";

const GameCanvas = lazy(() =>
  import("../components/game/GameCanvas").then((m) => ({ default: m.GameCanvas })),
);

function Splash({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0c12] font-mono text-sm tracking-[0.3em] text-stone-500">
      {label}
    </div>
  );
}

function GamePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Splash label="LOADING…" />;

  return (
    <Suspense fallback={<Splash label="ENTERING THE GRAVEYARD…" />}>
      <GameCanvas />
    </Suspense>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Graveyard Shift — Zombie Survival FPS" },
      {
        name: "description",
        content:
          "Hold a moonlit cemetery against endless waves of the undead in this browser first-person zombie survival shooter.",
      },
      { property: "og:title", content: "Graveyard Shift — Zombie Survival FPS" },
      {
        property: "og:description",
        content:
          "Endless wave-based zombie survival in a 3D graveyard. Headshots earn bonus points — how deep can you get?",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamePage,
});
