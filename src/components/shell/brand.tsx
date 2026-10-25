import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-md", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
        <ShieldCheck className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight">FDR Sentinel</span>
    </Link>
  );
}
