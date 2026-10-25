import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4">
      <div className="w-full max-w-sm space-y-5 py-16 text-center">
        <Brand className="justify-center" />
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-soft">
          <Compass className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">That address isn&apos;t part of the demo.</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/enter">Launch demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
