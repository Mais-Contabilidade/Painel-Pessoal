"use client";

import { usePrivacyStore } from "@/store/privacy-store";

/** Envolve um valor monetário/percentual financeiro: mascara enquanto a privacidade estiver ativa. */
export function PrivateValue({
  children,
  mask = "R$ ••••••",
}: {
  children: React.ReactNode;
  mask?: string;
}) {
  const visible = usePrivacyStore((s) => s.financialValuesVisible);
  return <>{visible ? children : mask}</>;
}

export function PrivatePercent({ children }: { children: React.ReactNode }) {
  const visible = usePrivacyStore((s) => s.financialValuesVisible);
  return <>{visible ? children : "••%"}</>;
}
