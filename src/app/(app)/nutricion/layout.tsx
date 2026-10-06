import { SubNav } from "@/components/sub-nav";

const ITEMS = [
  { href: "/nutricion", label: "Diario", exact: true },
  { href: "/nutricion/plan", label: "Plan semanal" },
  { href: "/nutricion/recetas", label: "Recetas" },
  { href: "/nutricion/menus", label: "Menús" },
  { href: "/nutricion/compras", label: "Compras" },
  { href: "/nutricion/progreso", label: "Progreso" },
  { href: "/nutricion/alimentos", label: "Alimentos" },
];

export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={ITEMS} accent="bg-nutri" />
      {children}
    </>
  );
}
