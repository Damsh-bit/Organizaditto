import type { Metadata } from "next";
import { MenusView } from "@/components/nutrition/menus-view";

export const metadata: Metadata = { title: "Menús para el bebé" };

export default function BabyMenusPage() {
  return <MenusView audience="baby" />;
}
