import type { Metadata } from "next";
import { AlertTriangle, Ban, HeartHandshake, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ALLERGEN_TIPS,
  ALLERGY_SIGNS,
  AVOID_BEFORE_1,
  CHOKING_HAZARDS,
  GAG_VS_CHOKE,
  READINESS_SIGNS,
  RESPONSIVE_FEEDING,
  STAGES,
  stageFor,
} from "@/lib/baby-guide";
import { getBabyContext } from "@/lib/data/baby";

export const metadata: Metadata = { title: "Guía de alimentación del bebé" };

export default async function GuiaPage() {
  const { months } = await getBabyContext();
  const current = stageFor(months);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Guía de alimentación complementaria"
        description="Lo esencial para empezar con los sólidos, etapa por etapa. Información general: ante cualquier duda, consultá con su pediatra."
      />

      <Card>
        <CardHeader>
          <CardTitle>¿Está lista para empezar?</CardTitle>
          <CardDescription>Alrededor de los 6 meses, cuando aparecen estas señales:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {READINESS_SIGNS.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-baby">✓</span> {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={current ? [current.key] : ["6"]} className="rounded-xl border bg-card px-4">
        {STAGES.map((s) => (
          <AccordionItem key={s.key} value={s.key}>
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <span>{s.emoji}</span> {s.title}
                {current?.key === s.key && <span className="rounded-full bg-baby/15 px-2 text-xs font-normal text-baby">etapa actual</span>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>{s.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Frecuencia</div>
                  {s.meals}
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Cantidad</div>
                  {s.amount}
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Texturas</div>
                  {s.textures}
                </div>
              </div>
              <div>
                <div className="mb-1 font-medium">Alimentos para ofrecer</div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {s.foods.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 font-medium">Tips</div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {s.tips.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="size-4 text-destructive" /> Evitar antes del año
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {AVOID_BEFORE_1.map((a) => (
              <div key={a.item}>
                <span className="font-medium">{a.item}:</span> <span className="text-muted-foreground">{a.why}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" /> Riesgo de atragantamiento
            </CardTitle>
            <CardDescription>Nunca enteros hasta los 4-5 años:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {CHOKING_HAZARDS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" /> Arcada vs. atragantamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{GAG_VS_CHOKE.gag}</p>
            <p className="font-medium">{GAG_VS_CHOKE.choke}</p>
            <p className="text-muted-foreground">{GAG_VS_CHOKE.course}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="size-4 text-baby" /> Alimentación perceptiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {RESPONSIVE_FEEDING.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alérgenos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {ALLERGEN_TIPS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Señales de alergia</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {ALLERGY_SIGNS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Fuentes: OMS, Ministerio de Salud de la Nación (Guías Alimentarias para la Población Infantil) y Sociedad Argentina de Pediatría. Esta guía
        es orientativa y no reemplaza la consulta pediátrica.
      </p>
    </div>
  );
}
