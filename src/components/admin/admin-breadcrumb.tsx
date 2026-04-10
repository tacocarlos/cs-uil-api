"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

/** Human-readable labels for known route segments. */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  problems: "Problems",
  competitions: "Competitions",
  settings: "Settings",
  new: "New",
  edit: "Edit",
};

function toLabel(segment: string): string {
  // Use a known label if available, otherwise title-case the segment.
  return (
    SEGMENT_LABELS[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

/**
 * Builds breadcrumb items from a pathname like `/admin/problems/42/edit`:
 *   Admin > Problems > 42 > Edit
 *
 * The last segment is rendered as a non-linked `BreadcrumbPage`.
 * All preceding segments are rendered as `BreadcrumbLink`s.
 */
export function AdminBreadcrumb() {
  const pathname = usePathname();

  // Split into non-empty segments: ["admin", "problems", "42"]
  const segments = pathname.split("/").filter(Boolean);

  // Build cumulative href for each segment.
  type CrumbItem = { label: string; href: string };
  const crumbs: CrumbItem[] = segments.map((segment, index) => ({
    label: toLabel(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
