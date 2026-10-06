import { SubNav } from "@/components/sub-nav";

const ITEMS = [
  { href: "/entrenamiento", label: "Resumen", exact: true },
  { href: "/entrenamiento/nuevo", label: "Registrar" },
  { href: "/entrenamiento/historial", label: "Historial" },
  { href: "/entrenamiento/rutinas", label: "Rutinas" },
  { href: "/entrenamiento/peso", label: "Peso" },
  { href: "/entrenamiento/progresion", label: "Progresión" },
];

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={ITEMS} accent="bg-gym" />
      {children}
    </>
  );
}
