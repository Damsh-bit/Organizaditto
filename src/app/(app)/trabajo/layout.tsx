import { SubNav } from "@/components/sub-nav";

const ITEMS = [
  { href: "/trabajo", label: "Resumen", exact: true },
  { href: "/trabajo/registro", label: "Registro" },
  { href: "/trabajo/cobros", label: "Cobros" },
  { href: "/trabajo/cotizacion", label: "Cotización" },
];

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={ITEMS} accent="bg-work" />
      {children}
    </>
  );
}
