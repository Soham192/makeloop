"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Logo } from "./ui";

export function AppHeader({ right }: { right?: ReactNode }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="flex items-center justify-between gap-3">
      <Logo href="/dashboard" />
      <div className="flex items-center gap-1">
        {right}
        <Button variant="ghost" onClick={logout} className="px-3 py-2 text-sm">
          Log out
        </Button>
      </div>
    </header>
  );
}
