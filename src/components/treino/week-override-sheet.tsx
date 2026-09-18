"use client";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useWorkoutStore } from "@/store/workout-store";
import { useSupabase } from "@/lib/supabase-provider";
import type { WeekVariantDb } from "@/lib/supabase/types";

export function WeekOverrideSheet({
  weekStartDate,
  currentVariant,
  onClose,
}: {
  weekStartDate: string;
  currentVariant: WeekVariantDb;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const setWeekOverride = useWorkoutStore((s) => s.setWeekOverride);

  const handlePick = async (variant: WeekVariantDb) => {
    if (!supabase) return;
    await setWeekOverride(supabase, weekStartDate, variant);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Corrigir semana atual">
      <p className="text-[13.5px] text-text-muted">
        A rotação automática marcou esta semana como <strong>Semana {currentVariant}</strong>. Se uma viagem ou
        imprevisto quebrou o ciclo, corrija manualmente só para esta semana — as seguintes voltam a se basear na
        âncora.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          variant={currentVariant === "A" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => handlePick("A")}
        >
          Esta semana é A
        </Button>
        <Button
          variant={currentVariant === "B" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => handlePick("B")}
        >
          Esta semana é B
        </Button>
      </div>
    </Sheet>
  );
}
