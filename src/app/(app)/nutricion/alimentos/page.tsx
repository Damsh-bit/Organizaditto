import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FoodsTable } from "@/components/nutrition/foods-table";
import { listFoods } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Alimentos" };

export default async function AlimentosPage() {
  const foods = await listFoods();
  return (
    <div>
      <PageHeader
        title="Alimentos"
        description="Tu base de alimentos: macros, unidades, dónde se compran y precios. Si editás un alimento, se recalculan las recetas que lo usan."
      />
      <FoodsTable foods={foods} />
    </div>
  );
}
