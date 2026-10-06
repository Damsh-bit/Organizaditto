import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCheck, RotateCcw, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { AddManualItem, ShareListButton, ShoppingItemRow } from "@/components/nutrition/shopping-client";
import { ProgressBar } from "@/components/stats";
import { Card } from "@/components/ui/card";
import { completeShoppingList, deleteShoppingList, resetShoppingList } from "@/app/actions/nutrition";
import { STORES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { fmtARS } from "@/lib/format";
import { quantityHint, quantityLabel } from "@/lib/shopping";
import { getShoppingList } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function ShoppingListPage({ params }: { params: Promise<{ id: string }> }) {
  const list = await getShoppingList(Number((await params).id));
  if (!list) notFound();

  const rows = list.items.map((it) => ({
    ...it,
    qty: it.quantity != null ? quantityLabel(it) : (it.unit ?? ""),
    hint: quantityHint(it, it.food),
  }));
  const fresh = rows.filter((r) => !r.isPantry);
  const pantry = rows.filter((r) => r.isPantry);
  const stores = Object.entries(STORES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, s]) => ({ key, ...s, items: fresh.filter((r) => r.store === key) }))
    .filter((s) => s.items.length > 0);
  const checked = rows.filter((r) => r.checked).length;
  const cost = rows.reduce((a, r) => a + (r.priceArs ?? 0), 0);
  const priced = rows.filter((r) => r.priceArs != null).length;

  const shareText = [
    `🛒 ${list.name}`,
    ...stores.map((s) => `\n*${s.emoji} ${s.label}*\n${s.items.filter((i) => !i.checked).map((i) => `• ${i.name}: ${i.qty}`).join("\n")}`),
    pantry.length ? `\n*🧂 Despensa (revisar)*\n${pantry.filter((i) => !i.checked).map((i) => `• ${i.name}`).join("\n")}` : "",
  ].join("\n");

  return (
    <div className="space-y-5">
      <Link href="/nutricion/compras" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Listas
      </Link>
      <PageHeader
        title={list.name}
        description={
          <>
            {list.startDate && `Del ${fmtDate(list.startDate)} al ${fmtDate(list.endDate ?? list.startDate)}`}
            {list.notes && ` · ${list.notes}`}
          </>
        }
        actions={<ShareListButton text={shareText} />}
      />

      <Card className="gap-2 px-4">
        <div className="flex items-center justify-between text-sm">
          <span>
            {checked} de {rows.length} en el changuito
          </span>
          {cost > 0 && (
            <span className="text-muted-foreground">
              Estimado {fmtARS(cost)}
              {priced < rows.length && <span className="text-xs"> ({priced}/{rows.length} con precio)</span>}
            </span>
          )}
        </div>
        <ProgressBar value={checked} max={Math.max(1, rows.length)} barClassName="bg-nutri" />
      </Card>

      <AddManualItem listId={list.id} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stores.map((s) => (
          <Card key={s.key} className="gap-0 py-0">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <div className="font-medium">
                {s.emoji} {s.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.items.filter((i) => i.checked).length}/{s.items.length}
              </div>
            </div>
            <div className="divide-y">
              {s.items.map((it) => (
                <ShoppingItemRow key={it.id} item={{ id: it.id, name: it.name, checked: it.checked, qty: it.qty, hint: it.hint, priceArs: it.priceArs, isManual: it.isManual }} />
              ))}
            </div>
          </Card>
        ))}
        {pantry.length > 0 && (
          <Card className="gap-0 py-0">
            <div className="border-b px-3 py-2.5">
              <div className="font-medium">🧂 Despensa</div>
              <div className="text-xs text-muted-foreground">Aceite, condimentos, etc. Revisá si ya tenés antes de comprar.</div>
            </div>
            <div className="divide-y">
              {pantry.map((it) => (
                <ShoppingItemRow key={it.id} item={{ id: it.id, name: it.name, checked: it.checked, qty: it.qty, hint: it.hint, priceArs: it.priceArs, isManual: it.isManual }} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <ActionButton variant="ghost" action={resetShoppingList.bind(null, list.id)}>
          <RotateCcw className="size-4" /> Desmarcar todo
        </ActionButton>
        {!list.completedAt && (
          <ActionButton variant="secondary" action={completeShoppingList.bind(null, list.id)}>
            <CheckCheck className="size-4" /> Compra terminada
          </ActionButton>
        )}
        <ActionButton
          variant="ghost"
          className="text-destructive"
          action={deleteShoppingList.bind(null, list.id)}
          confirm="¿Eliminar esta lista?"
          redirectTo="/nutricion/compras"
        >
          <Trash2 className="size-4" /> Eliminar
        </ActionButton>
      </div>
    </div>
  );
}
