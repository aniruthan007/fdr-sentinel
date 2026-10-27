import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Container } from "./primitives";

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#architecture", label: "Architecture" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <Container className="flex h-14 items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Brand href="/" />
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span className="hidden truncate text-xs text-muted-foreground sm:block">Team MAVERICKS · SIH1277</span>
        </div>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          <ThemeToggle />
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/enter">
              Launch demo
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
