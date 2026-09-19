import { Home, Dumbbell, Lightbulb, PiggyBank, BookHeart } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/financeiro", label: "Financeiro", icon: PiggyBank },
  { href: "/diario", label: "Diário", icon: BookHeart },
] as const;
