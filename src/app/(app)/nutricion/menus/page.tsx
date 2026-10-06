import type { Metadata } from "next";
import { MenusView } from "@/components/nutrition/menus-view";

export const metadata: Metadata = { title: "Menús semanales" };

export default function MenusPage() {
  return <MenusView audience="adult" />;
}
