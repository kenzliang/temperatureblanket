'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
const PIECE_COUNT = 60;

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  width: number;
  height: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 2.2 + Math.random() * 1.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: Math.random() * 360,
    width: 6 + Math.random() * 6,
    height: 3 + Math.random() * 4,
  }));
}

// Mounted by page.tsx only while someone has a 30+ day streak, so it plays
// once per such mount (e.g. on load, or when navigating into a date range
// where that's true) rather than on every page load.
//
// Pieces are generated in an effect, not at render time: Math.random() during
// the initial render would produce different values on the server (SSR) vs.
// the client (hydration), causing a hydration mismatch. Generating them after
// mount means the first render (both server and client) is empty and matches.
export function Confetti() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    setPieces(makePieces());
  }, []);

  if (!pieces) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
