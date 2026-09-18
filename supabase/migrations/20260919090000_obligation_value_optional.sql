-- Painel Pessoal — permite cadastrar um compromisso (Pagando) com estrutura e competências
-- definidas antes de o valor da parcela ser conhecido (ex.: "Outubro até Março, valor a definir").
-- Sem isso o app seria forçado a inventar um valor só para satisfazer o NOT NULL, o que a
-- regra de negócio proíbe explicitamente.

alter table public.financial_obligations
  alter column installment_value_cents drop not null;

alter table public.financial_obligations
  drop constraint if exists financial_obligations_installment_value_cents_check;

alter table public.financial_obligations
  add constraint financial_obligations_installment_value_cents_check
  check (installment_value_cents is null or installment_value_cents > 0);
