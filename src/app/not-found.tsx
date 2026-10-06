import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="space-y-3 text-center">
        <div className="text-5xl">🧭</div>
        <h1 className="text-xl font-semibold">No encontré esa página</h1>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
