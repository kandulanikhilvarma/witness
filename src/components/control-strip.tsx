"use client";

import { useState } from "react";

// A working control panel. Not decoration: the rocker arms the readout, the
// rotary selects a channel, and the readout reports the selected channel. It
// exists to make the drawing-office identity tactile, and everything on it is a
// real, keyboard-operable control with a visible state.

export interface Channel {
  key: string;
  standard: string;
  readout: string;
  note: string;
}

const DETENT_DEG = [-40, 0, 40];

export function ControlStrip({ channels, className = "" }: { channels: Channel[]; className?: string }) {
  const [armed, setArmed] = useState(true);
  const [ch, setCh] = useState(0);
  const chans = channels.slice(0, 3);
  const active = chans[ch] ?? chans[0];
  const angle = DETENT_DEG[ch] ?? 0;

  return (
    <div
      className={`grid items-center gap-5 rounded-md border border-iron/25 bg-ground-2 px-5 py-4 shadow-[var(--shadow-raise)] sm:grid-cols-[auto_auto_1fr] ${className}`}
    >
      {/* Power rocker */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={armed}
          aria-label="Arm the readout"
          onClick={() => setArmed((v) => !v)}
          className="rounded-sm outline-offset-4"
        >
          <svg viewBox="0 0 56 40" className="h-10 w-14" aria-hidden>
            <rect x="1" y="1" width="54" height="38" rx="5" fill="var(--color-ground)" stroke="var(--color-iron)" strokeWidth="1.25" />
            <rect
              x="7"
              y={armed ? 6 : 18}
              width="42"
              height="16"
              rx="3"
              fill={armed ? "var(--color-oxide)" : "color-mix(in srgb, var(--color-iron) 22%, transparent)"}
              stroke="var(--color-iron)"
              strokeWidth="1"
              style={{ transition: "y 140ms cubic-bezier(0.22,1,0.36,1), fill 140ms" }}
            />
            <text x="28" y={armed ? 17 : 30} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill={armed ? "var(--color-on-accent)" : "var(--color-iron)"}>
              {armed ? "ON" : "OFF"}
            </text>
          </svg>
        </button>
        <div className="flex flex-col gap-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: armed ? "var(--color-oxide)" : "color-mix(in srgb, var(--color-iron) 30%, transparent)",
              boxShadow: armed ? "0 0 8px var(--color-oxide)" : "none",
              transition: "all 140ms",
            }}
            aria-hidden
          />
          <span className="font-mono text-2xs uppercase tracking-[0.15em] text-iron">
            {armed ? "live" : "idle"}
          </span>
        </div>
      </div>

      {/* Rotary channel selector */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Channel selector, currently ${active.standard}. Activate to advance.`}
          onClick={() => setCh((c) => (c + 1) % chans.length)}
          className="rounded-full outline-offset-4"
        >
          <svg viewBox="0 0 72 72" className="h-14 w-14" aria-hidden>
            <circle cx="36" cy="36" r="30" fill="var(--color-ground)" stroke="var(--color-iron)" strokeWidth="1.25" />
            <circle cx="36" cy="36" r="22" fill="color-mix(in srgb, var(--color-iron) 8%, transparent)" stroke="var(--color-iron)" strokeWidth="0.75" />
            {DETENT_DEG.map((d, i) => {
              const rad = ((d - 90) * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  cx={36 + Math.cos(rad) * 27}
                  cy={36 + Math.sin(rad) * 27}
                  r="2"
                  fill={i === ch ? "var(--color-oxide)" : "var(--color-iron)"}
                />
              );
            })}
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "36px 36px", transition: "transform 200ms cubic-bezier(0.22,1,0.36,1)" }}>
              <line x1="36" y1="36" x2="36" y2="14" stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="36" cy="36" r="6" fill="var(--color-paper)" />
            </g>
          </svg>
        </button>
        <span className="font-mono text-2xs uppercase tracking-[0.15em] text-iron">select</span>
      </div>

      {/* Readout */}
      <div className="rounded-sm border border-iron/20 bg-ground px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">{active.standard}</span>
          <span className="font-mono text-2xs tabular text-iron">CH {ch + 1}/{chans.length}</span>
        </div>
        <div
          className="mt-1 font-display text-2xl tabular"
          style={{ color: armed ? "var(--color-paper)" : "color-mix(in srgb, var(--color-paper) 35%, transparent)", transition: "color 140ms" }}
        >
          {armed ? active.readout : "· · ·"}
        </div>
        <p className="mt-0.5 text-2xs leading-4 text-paper-2">{active.note}</p>
      </div>
    </div>
  );
}
