"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemFor } from "@/lib/nav";
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
        <BreadcrumbSeparator className="hidden sm:inline-flex" />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{item?.label ?? segments.at(-1)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
