"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { LotState } from "@/lib/auction";

export type LiveState = LotState & { rate: number; rateStale: boolean };

export type LotSettings = {
  shippingFlatBdt: number;
  portHandlingBdt: number;
  poolingDiscountPercent: number;
  minBidIncrementJpy: number;
  antiSnipeWindowSeconds: number;
  antiSnipeExtendSeconds: number;
};

type Ctx = {
  state: LiveState;
  /** Ticks down every second between polls so the clock looks continuous. */
  secondsRemaining: number;
  settings: LotSettings;
  pooled: boolean;
  setPooled: (v: boolean) => void;
  refresh: () => Promise<void>;
};

const LiveLotContext = createContext<Ctx | null>(null);

export function useLiveLot() {
  const ctx = useContext(LiveLotContext);
  if (!ctx) throw new Error("useLiveLot must be used inside LiveLotProvider");
  return ctx;
}

/** Agreed transport: poll. Serverless can't hold a WebSocket open. */
const POLL_MS = 3000;

export function LiveLotProvider({
  lotId,
  initialState,
  settings,
  children,
}: {
  lotId: string;
  initialState: LiveState;
  settings: LotSettings;
  children: React.ReactNode;
}) {
  const [state, setState] = useState(initialState);
  const [secondsRemaining, setSecondsRemaining] = useState(initialState.secondsRemaining);
  const [pooled, setPooled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/lots/${lotId}/state`, { cache: "no-store" });
      if (!res.ok) return;
      const next: LiveState = await res.json();
      setState(next);
      setSecondsRemaining(next.secondsRemaining);
    } catch {
      // Transient network error — the next tick retries.
    }
  }, [lotId]);

  // Poll the server for bids/extensions landing from other buyers.
  useEffect(() => {
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Tick locally between polls. The server remains the source of truth: every
  // poll overwrites this, so an anti-snipe extension shows up as time going up.
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo(
    () => ({ state, secondsRemaining, settings, pooled, setPooled, refresh }),
    [state, secondsRemaining, settings, pooled, refresh],
  );

  return <LiveLotContext.Provider value={value}>{children}</LiveLotContext.Provider>;
}
