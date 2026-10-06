export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Coincide si todas las palabras de la búsqueda están en el texto (sin tildes). */
export function matches(text: string, query: string) {
  const q = normalize(query);
  if (!q) return true;
  const t = normalize(text);
  return q.split(/\s+/).every((w) => t.includes(w));
}
