import { getUserRole } from "@auth/server";
import type { ReactNode } from "react";
import { auth } from "@/server/better-auth";
import type { User } from "@/server/better-auth/config";

export async function ShowIfAdmin({
  children,
  user = undefined,
}: {
  children: ReactNode;
  user: User | undefined;
}) {
  const userRole = user?.role ?? (await getUserRole());

  if (userRole == "admin") {
    return children;
  }

  return null;
}
