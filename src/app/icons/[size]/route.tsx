import { renderAppIcon } from "@/lib/app-icon";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const n = Number.parseInt(size, 10);
  const px = [192, 512].includes(n) ? n : 192;
  const maskable = size.includes("maskable");
  return renderAppIcon(px, maskable ? { rounded: false, padding: Math.round(px * 0.1) } : {});
}
