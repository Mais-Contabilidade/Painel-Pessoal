"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { Chip } from "@/components/ui/chip";
import { Input, Label, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/finance-store";
import { previewMovementImpact, type Goal, type Transaction, type TransactionType } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { useSupabase } from "@/lib/supabase-provider";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "aporte", label: "Aporte" },
  { value: "saldo_inicial", label: "Saldo inicial" },
  { value: "rendimento", label: "Rendimento" },
  { value: "retirada", label: "Retirada" },
];

const SOURCE_OPTIONS = ["Conta", "Caixinha", "Dinheiro", "Outro"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionSheet({
  goal,
  initialType,
  transaction,
  onClose,
}: {
  goal: Goal;
  initialType: TransactionType;
  /** Presente = editando um lançamento existente; ausente = criando um novo. */
  transaction?: Transaction | null;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const transactions = useFinanceStore((s) => s.transactions);
  const participants = useFinanceStore((s) => s.participants).filter((p) => p.goalId === goal.id);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const [valueCents, setValueCents] = useState(transaction?.value ?? 0);
  const [date, setDate] = useState(transaction?.date?.slice(0, 10) ?? todayISO());
  const [participantId, setParticipantId] = useState<string | null>(transaction?.participantId ?? null);
  const [source, setSource] = useState<string | null>(transaction?.source ?? null);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [justification, setJustification] = useState(transaction?.justification ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showParticipant = type === "aporte" || type === "saldo_inicial" || type === "retirada";
  const participantRequired = participants.length > 0 && (type === "aporte" || type === "saldo_inicial");

  const impact = useMemo(() => {
    if (valueCents <= 0) return null;
    const baseTransactions = transaction ? transactions.filter((t) => t.id !== transaction.id) : transactions;
    return previewMovementImpact(goal, baseTransactions, type, valueCents);
  }, [goal, type, valueCents, transactions, transaction]);

  const handleSave = async () => {
    if (valueCents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (type === "retirada" && justification.trim().length < 3) {
      setError("Explique o motivo da retirada.");
      return;
    }
    if (participantRequired && !participantId) {
      setError("Selecione quem aportou.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        type,
        value: valueCents,
        date: new Date(date).toISOString(),
        participantId: showParticipant ? participantId : null,
        source: showParticipant ? source : null,
        note: note.trim() || undefined,
        justification: type === "retirada" ? justification.trim() : undefined,
      };
      if (transaction) {
        await updateTransaction(supabase, transaction.id, input);
      } else {
        await addTransaction(supabase, { goalId: goal.id, ...input });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  };

  const titles: Record<TransactionType, string> = {
    aporte: transaction ? "Editar aporte" : "Novo aporte",
    saldo_inicial: transaction ? "Editar saldo inicial" : "Registrar saldo inicial",
    rendimento: transaction ? "Editar rendimento" : "Registrar rendimento",
    retirada: transaction ? "Editar retirada" : "Retirar valor",
  };

  return (
    <Sheet onClose={onClose} title={titles[type]}>
      <div className="space-y-4">
        <Segmented value={type} onChange={setType} options={TYPE_OPTIONS} />

        {type === "rendimento" && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] text-accent">
            Rendimento de CDI aumenta o saldo guardado, mas não é atribuído como contribuição de nenhum participante.
          </p>
        )}
        {type === "saldo_inicial" && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] text-accent">
            Dinheiro que já existia antes do planejamento — reduz o que falta, sem preencher meses futuros.
          </p>
        )}

        <div>
          <Label>Valor</Label>
          <MoneyInput valueCents={valueCents} onChange={setValueCents} autoFocus />
        </div>

        <div>
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {showParticipant && participants.length > 0 && (
          <div>
            <Label>Quem aportou{participantRequired ? "" : " (opcional)"}</Label>
            <div className="flex flex-wrap gap-1.5">
              {participants.map((p) => (
                <Chip key={p.id} active={participantId === p.id} onClick={() => setParticipantId(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {showParticipant && (
          <div>
            <Label>Origem (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_OPTIONS.map((s) => (
                <Chip key={s} active={source === s} onClick={() => setSource(source === s ? null : s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {type === "retirada" ? (
          <div>
            <Label>Justificativa (obrigatória)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="Por que você está retirando esse valor?"
            />
          </div>
        ) : (
          <div>
            <Label>Observação (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
          </div>
        )}

        {impact && (
          <div className="rounded-lg border border-warning-soft bg-warning-soft px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-warning">Impacto no planejamento</p>
            <p className="mt-1 text-[13px] text-text">
              Saldo: {formatBRL(impact.saldoBefore)} → {formatBRL(impact.saldoAfter)}
            </p>
            <p className="mt-0.5 text-[13px] text-text">
              Falta: {formatBRL(impact.remainingBefore)} → {formatBRL(impact.remainingAfter)}
            </p>
            <p className="mt-0.5 text-[13px] text-text">
              Necessário/mês: {formatBRL(impact.necessidadeMensalBefore)} → {formatBRL(impact.necessidadeMensalAfter)}
            </p>
          </div>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : transaction ? "Salvar alterações" : "Confirmar"}
        </Button>
      </div>
    </Sheet>
  );
}
