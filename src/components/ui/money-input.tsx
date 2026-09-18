"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { centsToReais, reaisToCents, type Cents } from "@/lib/money";

export function MoneyInput({
  valueCents,
  onChange,
  autoFocus,
}: {
  valueCents: Cents;
  onChange: (cents: Cents) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(() =>
    valueCents ? centsToReais(valueCents).toFixed(2).replace(".", ",") : ""
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[14px] text-text-faint">
        R$
      </span>
      <Input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9,]/g, "");
          setText(raw);
          const num = parseFloat(raw.replace(",", "."));
          onChange(Number.isFinite(num) ? reaisToCents(num) : 0);
        }}
        placeholder="0,00"
        className="pl-9"
      />
    </div>
  );
}
