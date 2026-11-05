"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function RateLimitBanner({
  retryAfterSec,
  onDone,
}: {
  retryAfterSec: number;
  onDone?: () => void;
}) {
  const [left, setLeft] = useState(retryAfterSec);

  useEffect(() => {
    setLeft(retryAfterSec);
  }, [retryAfterSec]);

  useEffect(() => {
    if (left <= 0) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  if (left <= 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Rate limited. Retry in <strong>{left}s</strong>.
      </span>
    </div>
  );
}
