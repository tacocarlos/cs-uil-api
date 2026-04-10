"use client";

import { AuthUIProvider as BetterAuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@auth/client";

export function AuthUIProvider({ children }: { children: ReactNode }) {
	const router = useRouter();

	return (
		<BetterAuthUIProvider
			authClient={authClient}
			navigate={router.push}
			Link={Link}
			onSessionChange={() => {
				// Clear router cache (protected routes)
				router.refresh();
			}}
			replace={router.replace}
			social={{
				providers: ["google"],
			}}
		>
			{children}
		</BetterAuthUIProvider>
	);
}
