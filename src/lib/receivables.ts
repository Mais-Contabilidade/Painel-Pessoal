import type { Cents } from "@/lib/money";

export type Receivable = {
  id: string;
  person: string;
  originalValueCents: Cents;
  lentOn: string;
  agreedReturnDate: string | null;
  notes: string | null;
  archived: boolean;
};

export type ReceivablePayment = {
  id: string;
  receivableId: string;
  amountCents: Cents;
  paidOn: string;
  note: string | null;
};

export type ReceivableStatus = "em_dia" | "vence_em_breve" | "atrasado" | "recebido";

export type ReceivableSummary = {
  receivable: Receivable;
  totalReceived: Cents;
  remaining: Cents;
  status: ReceivableStatus;
};

const SOON_THRESHOLD_DAYS = 7;

function daysUntil(dateISO: string, today: Date): number {
  const due = new Date(`${dateISO}T00:00:00`);
  return Math.round((due.getTime() - new Date(today.toDateString()).getTime()) / (24 * 60 * 60 * 1000));
}

export function computeReceivableSummary(
  receivable: Receivable,
  payments: ReceivablePayment[],
  today = new Date()
): ReceivableSummary {
  const totalReceived = payments.reduce((acc, p) => acc + p.amountCents, 0);
  const remaining = Math.max(0, receivable.originalValueCents - totalReceived);

  let status: ReceivableStatus;
  if (remaining <= 0) {
    status = "recebido";
  } else if (receivable.agreedReturnDate && daysUntil(receivable.agreedReturnDate, today) < 0) {
    status = "atrasado";
  } else if (receivable.agreedReturnDate && daysUntil(receivable.agreedReturnDate, today) <= SOON_THRESHOLD_DAYS) {
    status = "vence_em_breve";
  } else {
    status = "em_dia";
  }

  return { receivable, totalReceived, remaining, status };
}
