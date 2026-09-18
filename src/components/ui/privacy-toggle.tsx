"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/store/privacy-store";

export function PrivacyToggle({ className }: { className?: string }) {
  const visible = usePrivacyStore((s) => s.financialValuesVisible);
  const toggle = usePrivacyStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={visible ? "Ocultar valores financeiros" : "Mostrar valores financeiros"}
      title={visible ? "Ocultar valores" : "Mostrar valores"}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text ${className ?? ""}`}
    >
      {visible ? <Eye size={17} /> : <EyeOff size={17} />}
    </button>
  );
}
