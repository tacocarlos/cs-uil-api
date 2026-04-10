import { headers } from "next/headers";
import { cache } from "react";
import { auth } from ".";

export const getUser = cache(async () => {
  const session = await getSession();
  return session?.user;
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export const getUserRole = cache(async () => {
  const session = await getSession();
  return session?.user.role ?? "unknown";
});
