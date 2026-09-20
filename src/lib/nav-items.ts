import { Home, Dumbbell, Lightbulb, PiggyBank, BookHeart, LibraryBig, ChefHat } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/financeiro", label: "Financeiro", icon: PiggyBank },
  { href: "/diario", label: "Diário", icon: BookHeart },
  { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
  { href: "/receitas", label: "Receitas", icon: ChefHat },
] as const;
