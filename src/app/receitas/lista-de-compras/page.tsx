"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRecipesStore } from "@/store/recipes-store";
import { useMounted } from "@/lib/use-mounted";
import { useSupabase } from "@/lib/supabase-provider";
import { PageHeader } from "@/components/ui/page-header";

export default function ShoppingListPage() {
  const mounted = useMounted();
  const router = useRouter();
  const supabase = useSupabase();
  const shoppingItems = useRecipesStore((s) => s.shoppingItems);
  const toggleChecked = useRecipesStore((s) => s.toggleShoppingItemChecked);
  const deleteItem = useRecipesStore((s) => s.deleteShoppingItem);

  const { pending, checked } = useMemo(() => {
    const sorted = [...shoppingItems].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { pending: sorted.filter((i) => !i.checked), checked: sorted.filter((i) => i.checked) };
  }, [shoppingItems]);

  if (!mounted) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-5 pt-6">
        <button
          onClick={() => router.push("/receitas")}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="text-[13px] text-text-muted">Receitas</span>
      </div>
      <PageHeader title="Lista de compras" />

      <div className="px-5 pb-6">
        {shoppingItems.length === 0 ? (
          <p className="py-16 text-center text-[13.5px] text-text-muted">
            Nada na lista ainda. Adicione ingredientes a partir de uma receita.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <ul className="space-y-1.5">
                {pending.map((i) => (
                  <li key={i.id} className="flex items-center gap-2.5 rounded-xl border border-border-subtle px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => supabase && toggleChecked(supabase, i.id, true)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="flex-1 text-[13.5px] text-text">
                      {i.name}
                      {(i.quantity || i.unit) && (
                        <span className="text-text-muted"> — {i.quantity ?? ""} {i.unit ?? ""}</span>
                      )}
                    </span>
                    <button
                      onClick={() => supabase && deleteItem(supabase, i.id)}
                      aria-label="Remover item"
                      className="shrink-0 text-text-faint hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {checked.length > 0 && (
              <div>
                <p className="mb-1.5 px-1 text-[12px] font-medium text-text-faint">Comprados</p>
                <ul className="space-y-1.5">
                  {checked.map((i) => (
                    <li key={i.id} className="flex items-center gap-2.5 rounded-xl border border-border-subtle px-3.5 py-2.5 opacity-60">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => supabase && toggleChecked(supabase, i.id, false)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="flex-1 text-[13.5px] text-text line-through">{i.name}</span>
                      <button
                        onClick={() => supabase && deleteItem(supabase, i.id)}
                        aria-label="Remover item"
                        className="shrink-0 text-text-faint hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
