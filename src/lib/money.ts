/** Todos os valores monetários do app são inteiros em centavos para evitar erro de ponto flutuante. */
export type Cents = number;

export function reaisToCents(value: number): Cents {
  return Math.round(value * 100);
}

export function centsToReais(cents: Cents): number {
  return cents / 100;
}

export function formatBRL(cents: Cents): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Divide um total em N parcelas inteiras (centavos) cuja soma bate exatamente com o total. */
export function distributeCents(totalCents: Cents, parts: number): Cents[] {
  if (parts <= 0) return [];
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
