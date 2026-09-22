import { createFileRoute } from "@tanstack/react-router";

import { GameCanvas } from "../components/game/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false,
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
  component: GameCanvas,
});
