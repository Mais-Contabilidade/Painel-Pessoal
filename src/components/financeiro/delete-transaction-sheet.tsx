"use client";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PrivateValue } from "@/components/ui/private-value";
import { formatBRL } from "@/lib/money";
import { formatDateShort } from "@/lib/format";
import { useFinanceStore } from "@/store/finance-store";
import { useSupabase } from "@/lib/supabase-provider";
import type { Transaction, TransactionType } from "@/lib/finance";
import type { GoalParticipant } from "@/lib/finance";

const TITLE: Record<TransactionType, string> = {
  aporte: "Excluir este aporte?",
  saldo_inicial: "Excluir este saldo inicial?",
  rendimento: "Excluir este rendimento?",
  retirada: "Excluir esta retirada?",
};

const CONFIRM_LABEL: Record<TransactionType, string> = {
  aporte: "Excluir aporte",
  saldo_inicial: "Excluir saldo inicial",
  rendimento: "Excluir rendimento",
  retirada: "Excluir retirada",
};

export function DeleteTransactionSheet({
  transaction,
  participant,
  onClose,
}: {
  transaction: Transaction;
  participant: GoalParticipant | null;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  return (
    <Sheet onClose={onClose} title={TITLE[transaction.type]}>
      <div className="rounded-xl border border-border-subtle px-3.5 py-3">
        <p className="text-[18px] font-semibold text-text">
          <PrivateValue>{formatBRL(transaction.value)}</PrivateValue>
        </p>
        <p className="mt-0.5 text-[13px] text-text-muted">
          {participant ? participant.name : "Não informado"} · {formatDateShort(transaction.date)}
        </p>
      </div>
      <p className="mt-3 text-[13px] text-text-muted">
        O saldo será recalculado e o planejamento mensal reajustado.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={async () => {
            if (!supabase) return;
            await deleteTransaction(supabase, transaction.id);
            onClose();
          }}
        >
          {CONFIRM_LABEL[transaction.type]}
        </Button>
      </div>
    </Sheet>
  );
}
