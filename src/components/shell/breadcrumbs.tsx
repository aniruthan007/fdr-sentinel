"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemFor } from "@/lib/nav";
import { useDemoStore } from "@/store/demo-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const portalRoot = `/${segments[0] ?? ""}`;
  const portalLabel = segments[0] === "institution" ? "Institution" : "Official";
  const item = navItemFor(pathname);
  const atRoot = pathname === portalRoot;
  const detailId = item && pathname !== item.href ? segments.at(-1) : undefined;
  // Show the record's reference (VC-…, RR-…) rather than its internal id.
  const detailLabel = useDemoStore((s) => {
    if (!detailId || !s.data) return detailId;
    return s.data.cases.find((c) => c.id === detailId)?.ref ?? s.data.releaseRequests.find((r) => r.id === detailId)?.ref ?? detailId;
  });

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden sm:inline-flex">
          {atRoot ? (
            <BreadcrumbPage className="text-muted-foreground">{portalLabel}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={portalRoot}>{portalLabel}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!atRoot && <BreadcrumbSeparator className="hidden sm:inline-flex" />}
        {detailId && item ? (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink asChild>
                <Link href={item.href}>{item.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:inline-flex" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-mono text-[13px]">{detailLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          !atRoot && (
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{item?.label ?? segments.at(-1)}</BreadcrumbPage>
            </BreadcrumbItem>
          )
        )}
        {atRoot && (
          <>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{item?.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
