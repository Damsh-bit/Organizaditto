import { SubNav } from "@/components/sub-nav";

const ITEMS = [
  { href: "/bebe", label: "Resumen", exact: true },
  { href: "/bebe/registro", label: "Registro" },
  { href: "/bebe/crecimiento", label: "Crecimiento" },
  { href: "/bebe/vacunas", label: "Vacunas" },
  { href: "/bebe/alimentos", label: "Alimentos y alérgenos" },
  { href: "/bebe/recetas", label: "Recetas" },
  { href: "/bebe/plan", label: "Plan" },
  { href: "/bebe/menus", label: "Menús" },
  { href: "/bebe/guia", label: "Guía" },
];

export default function BabyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={ITEMS} accent="bg-baby" />
      {children}
    </>
  );
}
