// Arranca `next dev` o `next start` eligiendo en qué red escucha:
// - Sin contraseña: solo en esta PC (127.0.0.1), así nadie más en el Wi-Fi puede entrar.
// - Con contraseña (Ajustes → Celular, o APP_PASSWORD): en toda la red local, para usarla desde el celular.
// HOST=... fuerza otra dirección. Los argumentos extra (por ejemplo -p 3001) se pasan a next.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [mode = "dev", ...rest] = process.argv.slice(2);
const accessFile = process.env.ACCESS_FILE || path.join(os.homedir(), ".organizaditto", "access.json");
const protectedApp = Boolean(process.env.APP_PASSWORD) || fs.existsSync(accessFile);
const host = process.env.HOST || (protectedApp ? "0.0.0.0" : "127.0.0.1");
const portIdx = rest.findIndex((a) => a === "-p" || a === "--port");
const port = portIdx >= 0 ? rest[portIdx + 1] : process.env.PORT || "3000";

// Misma lógica que src/components/settings/phone-access.tsx: red de la casa, sin adaptadores virtuales.
const VIRTUAL = /vethernet|wsl|hyper-v|virtualbox|vmware|docker|loopback|radmin|hamachi|zerotier|tailscale|vpn/i;
const PRIVATE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];
const rank = (ip) => PRIVATE.findIndex((re) => re.test(ip));

if (host === "0.0.0.0") {
  const ips = Object.entries(os.networkInterfaces())
    .filter(([name]) => !VIRTUAL.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal && rank(i.address) >= 0)
    .map((i) => i.address)
    .sort((a, b) => rank(a) - rank(b));
  console.log(`\n  Desde el celular (mismo Wi-Fi): ${ips.map((ip) => `http://${ip}:${port}`).join("  ") || "sin red local detectada"}\n`);
} else {
  console.log("\n  Solo en esta PC. Para usarla desde el celular, poné una contraseña en Ajustes y reiniciá la app.\n");
}

const child = spawn("npx", ["next", mode, "-H", host, ...rest], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ORG_HOST: host },
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
