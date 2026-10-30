"use client";

import { useEffect, useState } from "react";

// Counts down from `seconds` each time `trigger` changes (e.g. a new form result).
export function useCountdown(seconds: number | undefined, trigger: unknown) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!seconds) return;
    setLeft(seconds);
    const t = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(t), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds, trigger]);
  return left;
}
