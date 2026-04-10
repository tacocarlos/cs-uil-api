import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lunar CS - Account",
} satisfies Metadata;

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
