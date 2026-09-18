"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Sair"
      title="Sair"
      className={`flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-danger ${className ?? ""}`}
    >
      <LogOut size={17} />
    </button>
  );
}
