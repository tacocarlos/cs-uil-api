import Link from "next/link";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUser, getUserRole } from "@/server/better-auth/server";
import { ShowIfAdmin } from "@/components/admin/admin-only";
import { UserIcon } from "./user-icon";

export async function SiteNavbar() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center gap-4 px-4 sm:px-6">
        {/* Left side: logo + nav links */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <Moon className="size-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-sm">Lunar CS</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-4">
            <Link
              href="/#problems"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Problems
            </Link>
            <Link
              href="/competitions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Competitions
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        {/* Right side: auth buttons */}
        <div className="ml-auto flex items-center gap-2">
          <ShowIfAdmin user={user}>
            <Link href="/admin/">
              <Button variant="outline" size="sm">
                Admin Site
              </Button>
            </Link>
          </ShowIfAdmin>
          <UserIcon user={user} />
        </div>
      </div>
    </header>
  );
}
