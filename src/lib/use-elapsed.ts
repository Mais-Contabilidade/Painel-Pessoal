import { useEffect, useState } from "react";

/** Tempo decorrido (ms) desde `startedAt`, atualizado a cada segundo. Sobrevive a reload pois é sempre recalculado a partir da hora real. */
export function useElapsed(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return 0;
  return Math.max(0, now - new Date(startedAt).getTime());
}
