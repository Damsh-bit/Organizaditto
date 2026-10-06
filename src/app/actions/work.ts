"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payouts, workLogs } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isISODate, todayISO } from "@/lib/dates";
import { fmtARS, fmtHours, fmtUSD, parseNum } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { getEffectiveRate, getQuotes } from "@/lib/data/rates";

function refresh() {
  revalidatePath("/", "layout");
}

function hoursFromTimes(start: string, end: string): number | null {
  const m1 = start.match(/^(\d{1,2}):(\d{2})$/);
  const m2 = end.match(/^(\d{1,2}):(\d{2})$/);
  if (!m1 || !m2) return null;
  let mins = Number(m2[1]) * 60 + Number(m2[2]) - (Number(m1[1]) * 60 + Number(m1[2]));
  if (mins < 0) mins += 24 * 60; // pasó la medianoche
  return mins / 60;
}

export async function saveWorkLog(fd: FormData): Promise<ActionResult> {
  const id = parseNum(fd.get("id"));
  const date = String(fd.get("date") ?? "");
  if (!isISODate(date)) return fail("Fecha inválida");
  const start = String(fd.get("start") ?? "").trim();
  const end = String(fd.get("end") ?? "").trim();
  let hours = parseNum(fd.get("hours"));
  if ((hours == null || hours <= 0) && start && end) hours = hoursFromTimes(start, end);
  if (hours == null || hours <= 0 || hours > 24) return fail("Indicá las horas (o el horario de inicio y fin)");
  const settings = await getSettings();
  const { rate } = await getEffectiveRate(settings);
  const db = await getDb();
  const values = {
    date,
    hours: Math.round(hours * 100) / 100,
    project: String(fd.get("project") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
  };
  if (id) {
    await db.update(workLogs).set(values).where(eq(workLogs.id, id));
  } else {
    await db.insert(workLogs).values({ ...values, rateUsd: settings.hourlyRateUsd, arsRate: rate.value });
  }
  refresh();
  const usd = values.hours * settings.hourlyRateUsd;
  return ok(`${fmtHours(values.hours)} → ${fmtUSD(usd)} (${fmtARS(usd * rate.value)})`);
}

export async function quickAddHours(date: string, hours: number): Promise<ActionResult> {
  if (!isISODate(date) || !(hours > 0 && hours <= 24)) return fail("Datos inválidos");
  const settings = await getSettings();
  const { rate } = await getEffectiveRate(settings);
  const db = await getDb();
  await db.insert(workLogs).values({ date, hours, rateUsd: settings.hourlyRateUsd, arsRate: rate.value });
  refresh();
  return ok(`+${fmtHours(hours)} · ${fmtUSD(hours * settings.hourlyRateUsd)}`);
}

export async function deleteWorkLog(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(workLogs).where(eq(workLogs.id, id));
  refresh();
  return ok("Registro eliminado");
}

export async function startWorkTimer(project?: string): Promise<ActionResult> {
  const db = await getDb();
  const [running] = await db.select().from(workLogs).where(eq(workLogs.running, true)).limit(1);
  if (running) return fail("Ya hay una jornada en curso");
  const settings = await getSettings();
  await db.insert(workLogs).values({
    date: todayISO(),
    hours: 0,
    startedAt: new Date(),
    running: true,
    project: project?.trim() || null,
    rateUsd: settings.hourlyRateUsd,
  });
  refresh();
  return ok("¡Arrancó la jornada! A romperla 💪");
}

export async function stopWorkTimer(id: number, description?: string): Promise<ActionResult> {
  const db = await getDb();
  const [row] = await db.select().from(workLogs).where(eq(workLogs.id, id));
  if (!row || !row.running || !row.startedAt) return fail("No hay jornada en curso");
  const end = new Date();
  const hours = Math.max(0.01, (end.getTime() - row.startedAt.getTime()) / 3_600_000);
  const settings = await getSettings();
  const { rate } = await getEffectiveRate(settings);
  await db
    .update(workLogs)
    .set({
      endedAt: end,
      running: false,
      hours: Math.round(hours * 100) / 100,
      arsRate: rate.value,
      description: description?.trim() || row.description,
    })
    .where(eq(workLogs.id, id));
  refresh();
  return ok(`Jornada cerrada: ${fmtHours(hours)} → ${fmtUSD(hours * row.rateUsd)}`);
}

export async function cancelWorkTimer(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(workLogs).where(eq(workLogs.id, id));
  refresh();
  return ok("Jornada descartada");
}

export async function savePayout(fd: FormData): Promise<ActionResult> {
  const date = String(fd.get("date") ?? "");
  if (!isISODate(date)) return fail("Fecha inválida");
  const amountUsd = parseNum(fd.get("amountUsd"));
  if (!amountUsd || amountUsd <= 0) return fail("Indicá el monto en dólares");
  let arsRate = parseNum(fd.get("arsRate"));
  const amountArsInput = parseNum(fd.get("amountArs"));
  if (!arsRate && amountArsInput) arsRate = amountArsInput / amountUsd;
  if (!arsRate) {
    const { rate } = await getEffectiveRate(await getSettings());
    arsRate = rate.value;
  }
  const db = await getDb();
  await db.insert(payouts).values({
    date,
    amountUsd,
    arsRate,
    amountArs: amountArsInput ?? amountUsd * arsRate,
    method: String(fd.get("method") ?? "wallbit") || "wallbit",
    notes: String(fd.get("notes") ?? "").trim() || null,
  });
  refresh();
  return ok("Cobro registrado");
}

export async function deletePayout(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(payouts).where(eq(payouts.id, id));
  refresh();
  return ok("Cobro eliminado");
}

export async function refreshRates(): Promise<ActionResult> {
  const { live } = await getQuotes(true);
  refresh();
  return live ? ok("Cotizaciones actualizadas") : fail("No se pudo conectar con las cotizaciones. Se usan las últimas guardadas.");
}
