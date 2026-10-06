// Levanta `next dev` usando una base PGlite separada (para pruebas), en el puerto 3100.
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const dir = process.env.PGLITE_DIR ?? path.join(os.tmpdir(), "organizaditto-test-pgdata");
const child = spawn("npx", ["next", "dev", "-p", "3100"], {
  stdio: "inherit",
  shell: true,
  // Los backups automáticos de prueba van a una carpeta temporal, nunca a la de los datos reales.
  env: { ...process.env, PGLITE_DIR: dir, BACKUP_DIR: process.env.BACKUP_DIR ?? path.join(os.tmpdir(), "organizaditto-test-backups") },
});
child.on("exit", (code) => process.exit(code ?? 0));
