import os from "node:os";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { KeyRound, Smartphone, TriangleAlert, Wifi } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { Field } from "@/components/form-fields";
import { Input } from "@/components/ui/input";
import { removeLocalPassword, setLocalPassword } from "@/app/actions/auth";
import { authSource } from "@/lib/auth";

const VIRTUAL = /vethernet|wsl|hyper-v|virtualbox|vmware|docker|loopback|radmin|hamachi|zerotier|tailscale|vpn/i;
const PRIVATE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

/**
 * IPv4 de la red de la casa, primero las 192.168.x.x (las típicas de un router hogareño).
 * Se descartan adaptadores virtuales (WSL, Hyper-V, VPN…): el celular no llega a esas.
 * (Misma lógica que scripts/serve.mjs.)
 */
function lanAddresses() {
  const rank = (ip: string) => PRIVATE.findIndex((re) => re.test(ip));
  return Object.entries(os.networkInterfaces())
    .filter(([name]) => !VIRTUAL.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal && rank(i.address) >= 0)
    .map((i) => i.address)
    .sort((a, b) => rank(a) - rank(b));
}

export async function PhoneAccess() {
  const source = authSource();
  if (process.env.VERCEL) {
    return (
      <p className="text-sm text-muted-foreground">
        La app está publicada: entrá desde el navegador del celular con la misma dirección y agregala a la pantalla de inicio.
        {source !== "env" && " Ojo: no tiene contraseña. Definí la variable APP_PASSWORD en Vercel."}
      </p>
    );
  }

  const host = (await headers()).get("host") ?? "localhost:3000";
  const port = host.includes(":") ? host.split(":").pop() : "80";
  const urls = lanAddresses().map((ip) => `http://${ip}${port === "80" ? "" : `:${port}`}`);
  const listening = process.env.ORG_HOST === "0.0.0.0";
  const qr = source && urls[0] ? await QRCode.toString(urls[0], { type: "svg", margin: 1, width: 168 }) : null;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p>
          Con el celular conectado al mismo Wi-Fi que esta PC podés usar la app sin publicarla en internet. La PC tiene que estar prendida con la app
          abierta. Para que nadie más en la red pueda ver tus datos, primero poné una contraseña.
        </p>
      </div>

      {source === "env" ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <KeyRound className="size-4" /> La contraseña está definida con la variable APP_PASSWORD.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <KeyRound className="size-4 text-primary" /> {source ? "Cambiar contraseña" : "1. Poné una contraseña"}
          </div>
          <ActionForm action={setLocalPassword} resetOnSuccess className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Contraseña" htmlFor="access-password">
              <Input id="access-password" name="password" type="password" autoComplete="new-password" minLength={6} required />
            </Field>
            <Field label="Repetila" htmlFor="access-confirm">
              <Input id="access-confirm" name="confirm" type="password" autoComplete="new-password" minLength={6} required />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
          {source === "local" && (
            <ActionButton
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              action={removeLocalPassword}
              confirm="Sin contraseña la app vuelve a funcionar solo en esta PC (después de reiniciarla). ¿Quitarla?"
            >
              Quitar contraseña
            </ActionButton>
          )}
        </div>
      )}

      {source && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Wifi className="size-4 text-primary" /> {source === "env" ? "Entrá desde el celular" : "2. Entrá desde el celular"}
          </div>
          {!listening && (
            <p className="flex gap-2 rounded-lg bg-warning/10 p-2.5 text-xs">
              <TriangleAlert className="size-3.5 shrink-0 text-warning" />
              Cerrá la app y volvé a abrirla con «Iniciar Organizaditto» (o `npm start`) para que empiece a escuchar en tu Wi-Fi.
            </p>
          )}
          {urls.length === 0 ? (
            <p className="text-muted-foreground">No encontré una red Wi-Fi o cableada en esta PC.</p>
          ) : (
            <div className="flex flex-wrap items-start gap-4">
              {qr && (
                // El SVG lo genera la librería qrcode a partir de la URL local (no hay contenido de terceros).
                <div className="rounded-xl border bg-white p-2" aria-label={`Código QR de ${urls[0]}`} dangerouslySetInnerHTML={{ __html: qr }} />
              )}
              <div className="space-y-2">
                <p className="text-muted-foreground">Escaneá el código con la cámara o escribí:</p>
                {urls.map((u) => (
                  <div key={u} className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 text-sm">{u}</code>
                    <CopyButton text={u} />
                  </div>
                ))}
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>La primera vez Windows puede preguntar si Node.js puede usar la red: elegí «Redes privadas».</li>
                  <li>Una vez adentro, en el menú del navegador elegí «Agregar a pantalla de inicio».</li>
                  <li>Por Wi-Fi la conexión no es https: el escáner de códigos de barras y el modo sin conexión solo andan en esta PC o publicada.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
