import { useEffect, useState } from "react";

import { audio } from "../../game/audio";
import { useGameStore } from "../../game/store";

function Crosshair() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-6 w-6 opacity-80">
        <span className="absolute left-1/2 top-0 h-2 w-[2px] -translate-x-1/2 bg-lime-300/90" />
        <span className="absolute bottom-0 left-1/2 h-2 w-[2px] -translate-x-1/2 bg-lime-300/90" />
        <span className="absolute left-0 top-1/2 h-[2px] w-2 -translate-y-1/2 bg-lime-300/90" />
        <span className="absolute right-0 top-1/2 h-[2px] w-2 -translate-y-1/2 bg-lime-300/90" />
      </div>
    </div>
  );
}

export function HUD({ locked }: { locked: boolean }) {
  const state = useGameStore((s) => s.state);
  const score = useGameStore((s) => s.score);
  const highScore = useGameStore((s) => s.highScore);
  const wave = useGameStore((s) => s.wave);
  const health = useGameStore((s) => s.health);
  const ammo = useGameStore((s) => s.ammo);
  const reserve = useGameStore((s) => s.reserve);
  const reloading = useGameStore((s) => s.reloading);
  const kills = useGameStore((s) => s.kills);
  const banner = useGameStore((s) => s.waveBanner);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      const s = useGameStore.getState();
      if (s.state === "playing") s.pause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playing = state === "playing";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-mono text-stone-100">
      {playing && (
        <>
          <Crosshair />
          {health < 40 && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                boxShadow: "inset 0 0 180px rgba(150,10,10,0.75)",
              }}
            />
          )}

          {/* wave + score */}
          <div className="absolute left-6 top-5">
            <div className="text-[11px] uppercase tracking-[0.35em] text-stone-400">Wave</div>
            <div className="text-4xl font-black text-amber-300 drop-shadow">{wave}</div>
          </div>
          <div className="absolute right-6 top-5 text-right">
            <div className="text-[11px] uppercase tracking-[0.35em] text-stone-400">Points</div>
            <div className="text-4xl font-black drop-shadow">{score.toLocaleString()}</div>
            <div className="text-[11px] text-stone-400">{kills} kills</div>
          </div>

          {/* health */}
          <div className="absolute bottom-6 left-6 w-56">
            <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-stone-400">
              Health
            </div>
            <div className="h-3 overflow-hidden rounded-sm border border-stone-600/60 bg-black/50">
              <div
                className={`h-full transition-all duration-200 ${
                  health > 55 ? "bg-lime-500" : health > 25 ? "bg-amber-400" : "bg-red-600"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          {/* ammo */}
          <div className="absolute bottom-5 right-6 text-right">
            <div className="text-[11px] uppercase tracking-[0.3em] text-stone-400">Ammo</div>
            <div className="text-4xl font-black tabular-nums">
              <span className={ammo === 0 ? "text-red-500" : ""}>
                {String(ammo).padStart(2, "0")}
              </span>
              <span className="text-lg text-stone-400"> / {reserve}</span>
            </div>
            {(reloading || (ammo === 0 && reserve > 0)) && (
              <div className="animate-pulse text-sm text-amber-300">
                {reloading ? "RELOADING…" : "PRESS R TO RELOAD"}
              </div>
            )}
            {ammo === 0 && reserve === 0 && (
              <div className="text-sm text-red-400">OUT OF AMMO — SURVIVE!</div>
            )}
          </div>

          {banner && (
            <div className="absolute left-1/2 top-24 -translate-x-1/2 text-center">
              <div className="text-5xl font-black tracking-[0.2em] text-red-500 drop-shadow-[0_0_18px_rgba(220,38,38,0.6)]">
                {banner}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.4em] text-stone-300">
                they are coming
              </div>
            </div>
          )}

          {!locked && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-16 rounded bg-black/60 px-4 py-2 text-sm text-stone-200">
              Click to capture the mouse
            </div>
          )}
        </>
      )}

      {state === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center">
          <div className="text-xs uppercase tracking-[0.6em] text-red-500">Undead Protocol</div>
          <h1 className="mt-3 text-6xl font-black tracking-tight text-stone-100 drop-shadow-[0_0_25px_rgba(220,38,38,0.35)]">
            GRAVEYARD <span className="text-red-600">SHIFT</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
            Endless waves of the dead close in on an abandoned cemetery. Hold the line,
            headshot for bonus points, and see how deep you can get.
          </p>
          <button
            className="pointer-events-auto mt-8 rounded border border-red-700 bg-red-700/90 px-10 py-4 text-lg font-bold tracking-widest text-white transition hover:bg-red-600"
            onClick={() => {
              audio.init();
              useGameStore.getState().start();
            }}
          >
            START SHIFT
          </button>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-stone-400">
            <span>WASD — move</span>
            <span>Mouse — aim</span>
            <span>Click — fire</span>
            <span>R — reload</span>
            <span>Shift — sprint</span>
            <span>Esc — pause</span>
          </div>
          {highScore > 0 && (
            <div className="mt-6 text-xs uppercase tracking-[0.3em] text-amber-400">
              Best: {highScore.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {state === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
          <div className="rounded-lg border border-stone-700 bg-black/80 px-10 py-8 text-center">
            <h2 className="text-3xl font-black tracking-widest">PAUSED</h2>
            <p className="mt-2 text-sm text-stone-400">Wave {wave} · {score.toLocaleString()} pts</p>
            <button
              className="pointer-events-auto mt-6 rounded bg-stone-100 px-8 py-3 font-bold text-black hover:bg-white"
              onClick={() => useGameStore.getState().resume()}
            >
              RESUME
            </button>
          </div>
        </div>
      )}

      {state === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center">
          <h2 className="text-6xl font-black tracking-widest text-red-600">YOU DIED</h2>
          <p className="mt-4 text-lg text-stone-200">
            Survived to <span className="font-bold text-amber-300">wave {wave}</span> ·{" "}
            {kills} kills
          </p>
          <p className="mt-1 text-3xl font-black">{score.toLocaleString()} pts</p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-stone-400">
            {score >= highScore ? "NEW RECORD" : `Best: ${highScore.toLocaleString()}`}
          </p>
          <button
            className="pointer-events-auto mt-8 rounded border border-red-700 bg-red-700/90 px-10 py-4 font-bold tracking-widest text-white hover:bg-red-600"
            onClick={() => {
              useGameStore.getState().reset();
              useGameStore.getState().start();
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      <button
        className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-stone-500 hover:text-stone-200"
        onClick={() => setMuted(audio.toggleMute())}
      >
        {muted ? "sound off" : "sound on"}
      </button>
    </div>
  );
}
