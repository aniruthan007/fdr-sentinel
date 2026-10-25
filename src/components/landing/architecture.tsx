import { cn } from "@/lib/utils";
import { LandingSection, Reveal } from "./primitives";

type Variant = "client" | "core" | "data" | "mock";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  variant?: Variant;
}

interface Layout {
  width: number;
  height: number;
  boxes: Box[];
  /** Container rectangles drawn behind boxes. */
  groups?: { x: number; y: number; w: number; h: number; label: string }[];
  labels?: { x: number; y: number; text: string; anchor?: "start" | "middle" }[];
  /** SVG path data. `arrow` adds an arrowhead at the end; `dashed` marks a mock integration. */
  edges: { d: string; arrow?: boolean; dashed?: boolean }[];
}

const BOX_CLASS: Record<Variant, string> = {
  client: "fill-accent stroke-primary/40",
  core: "fill-card stroke-border",
  data: "fill-muted stroke-border",
  mock: "fill-card stroke-muted-foreground/50",
};

const DESKTOP: Layout = {
  width: 1000,
  height: 470,
  boxes: [
    { x: 170, y: 20, w: 300, h: 60, title: "Institution Portal", sub: "/institution · owners and operators", variant: "client" },
    { x: 530, y: 20, w: 300, h: 60, title: "Official Operations Portal", sub: "/official · role-based navigation", variant: "client" },
    { x: 170, y: 130, w: 660, h: 60, title: "API", sub: "OIDC sign-in · can(role, action) checked on every request · RLS per institution" },
    { x: 170, y: 250, w: 150, h: 70, title: "Policy engine", sub: "Versioned, sourced rules" },
    { x: 340, y: 250, w: 150, h: 70, title: "Document service", sub: "Private storage · OCR" },
    { x: 510, y: 250, w: 150, h: 70, title: "Workflow", sub: "Explicit state machines" },
    { x: 680, y: 250, w: 150, h: 70, title: "Audit service", sub: "SHA-256 hash chain" },
    { x: 170, y: 390, w: 320, h: 60, title: "PostgreSQL", sub: "Row-Level Security · numeric money · UTC", variant: "data" },
    { x: 510, y: 390, w: 320, h: 60, title: "Object storage", sub: "Private buckets · SHA-256 per file", variant: "data" },
    { x: 10, y: 250, w: 130, h: 70, title: "Scheduler", sub: "Daily maturity scan" },
    { x: 870, y: 210, w: 120, h: 50, title: "Bank", sub: "SIMULATED", variant: "mock" },
    { x: 870, y: 275, w: 120, h: 50, title: "PGRC / Vigilance", sub: "SIMULATED", variant: "mock" },
    { x: 870, y: 340, w: 120, h: 50, title: "SMS / Email", sub: "SIMULATED", variant: "mock" },
  ],
  labels: [{ x: 930, y: 410, text: "Mock adapters", anchor: "middle" }],
  edges: [
    { d: "M320 80 V128", arrow: true },
    { d: "M680 80 V128", arrow: true },
    { d: "M500 190 V220 M245 220 H755" },
    { d: "M245 220 V248", arrow: true },
    { d: "M415 220 V248", arrow: true },
    { d: "M585 220 V248", arrow: true },
    { d: "M755 220 V248", arrow: true },
    { d: "M245 320 V355 M415 320 V355 M585 320 V355 M755 320 V355 M245 355 H755" },
    { d: "M330 355 V388", arrow: true },
    { d: "M670 355 V388", arrow: true },
    { d: "M75 250 V160 H168", arrow: true },
    { d: "M830 160 H930 V208", arrow: true, dashed: true },
    { d: "M930 260 V273", dashed: true },
    { d: "M930 325 V338", dashed: true },
  ],
};

const MOBILE: Layout = {
  width: 360,
  height: 712,
  boxes: [
    { x: 10, y: 10, w: 165, h: 60, title: "Institution Portal", sub: "/institution", variant: "client" },
    { x: 185, y: 10, w: 165, h: 60, title: "Official Portal", sub: "/official · by role", variant: "client" },
    { x: 10, y: 100, w: 340, h: 60, title: "API", sub: "OIDC · can(role, action) on every request" },
    { x: 22, y: 218, w: 152, h: 62, title: "Policy engine", sub: "Versioned rules" },
    { x: 186, y: 218, w: 152, h: 62, title: "Document service", sub: "Storage · OCR" },
    { x: 22, y: 290, w: 152, h: 62, title: "Workflow", sub: "State machines" },
    { x: 186, y: 290, w: 152, h: 62, title: "Audit service", sub: "SHA-256 chain" },
    { x: 10, y: 396, w: 340, h: 56, title: "PostgreSQL", sub: "Row-Level Security per institution", variant: "data" },
    { x: 10, y: 462, w: 340, h: 56, title: "Object storage", sub: "Private · SHA-256 per file", variant: "data" },
    { x: 10, y: 548, w: 340, h: 52, title: "Scheduler", sub: "Daily maturity scan → workflow" },
    { x: 10, y: 646, w: 106, h: 56, title: "Bank", sub: "SIMULATED", variant: "mock" },
    { x: 127, y: 646, w: 106, h: 56, title: "PGRC / Vig.", sub: "SIMULATED", variant: "mock" },
    { x: 244, y: 646, w: 106, h: 56, title: "SMS / Email", sub: "SIMULATED", variant: "mock" },
  ],
  groups: [{ x: 10, y: 190, w: 340, h: 176, label: "Core services" }],
  labels: [{ x: 10, y: 634, text: "Mock adapters" }],
  edges: [
    { d: "M92 70 V98", arrow: true },
    { d: "M268 70 V98", arrow: true },
    { d: "M180 160 V188", arrow: true },
    { d: "M180 366 V394", arrow: true },
  ],
};

function Diagram({ layout, className, title }: { layout: Layout; className?: string; title: string }) {
  const markerId = `arrow-${layout.width}`;
  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-muted-foreground/70" />
        </marker>
      </defs>

      {layout.groups?.map((g) => (
        <g key={g.label}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={12} className="fill-muted/50 stroke-border" strokeWidth={1} />
          <text x={g.x + 12} y={g.y + 18} className="fill-muted-foreground text-[11px] font-medium">
            {g.label}
          </text>
        </g>
      ))}

      {layout.edges.map((e, i) => (
        <path
          key={i}
          d={e.d}
          fill="none"
          strokeWidth={1.25}
          strokeDasharray={e.dashed ? "4 4" : undefined}
          className="stroke-muted-foreground/50"
          markerEnd={e.arrow ? `url(#${markerId})` : undefined}
        />
      ))}

      {layout.boxes.map((b) => {
        const v = b.variant ?? "core";
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        return (
          <g key={`${b.title}-${b.x}-${b.y}`}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={10}
              strokeWidth={1}
              strokeDasharray={v === "mock" ? "4 3" : undefined}
              className={BOX_CLASS[v]}
            />
            <text x={cx} y={b.sub ? cy - 3 : cy + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {b.title}
            </text>
            {b.sub && (
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                className={cn("text-[10.5px]", v === "mock" ? "fill-status-warning font-mono" : "fill-muted-foreground")}
              >
                {b.sub}
              </text>
            )}
          </g>
        );
      })}

      {layout.labels?.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor={l.anchor ?? "start"} className="fill-muted-foreground text-[11px] font-medium">
          {l.text}
        </text>
      ))}
    </svg>
  );
}

const DEMO_LAYER = [
  ["Authorisation", "The same can(role, action) check gates every command"],
  ["Workflow", "The same explicit state machines reject illegal transitions"],
  ["Audit", "The same SHA-256 chain, computed with Web Crypto"],
  ["Data", "Typed seed data in browser storage instead of PostgreSQL"],
];

export function Architecture() {
  const title =
    "Production architecture: Institution and Official portals call one API, which fronts the policy engine, document service, workflow and audit services, backed by PostgreSQL and object storage, with mock adapters for bank, PGRC and SMS.";
  return (
    <LandingSection
      id="architecture"
      eyebrow="Architecture · production target"
      title="Two portals, one API, one source of truth."
      lede="Permissions are enforced on the server and in the database, not by hiding buttons. External systems sit behind typed adapters; in this prototype every one is a labelled mock."
    >
      <Reveal className="rounded-xl border bg-card p-3 shadow-soft sm:p-6">
        <Diagram layout={DESKTOP} title={title} className="hidden md:block" />
        <Diagram layout={MOBILE} title={title} className="md:hidden" />
      </Reveal>
      <Reveal delay={0.05} className="mt-4 rounded-xl border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-semibold">What this demo runs today, in your browser</p>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_LAYER.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </LandingSection>
  );
}
