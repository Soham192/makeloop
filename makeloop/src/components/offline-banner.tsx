"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="bg-sun px-4 py-2 text-center text-sm font-semibold text-ink">
      You&apos;re offline. Don&apos;t worry — nothing is lost. Keep building, and we&apos;ll be ready when you&apos;re back!
    </div>
  );
}
