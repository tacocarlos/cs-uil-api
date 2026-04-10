import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/better-auth/server";
import { SiteNavbar } from "@/components/site/site-navbar";
import { UserInfoCard } from "@/components/account/user-info-card";
import { DeleteAccountCard } from "@/components/account/delete-account-card";
import { Button } from "@ui/button";
export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const { user } = session;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <SiteNavbar />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your personal information and account settings.
            </p>
          </div>

          <div className="space-y-6">
            <Link href="/account/settings">
              <Button className="w-full bg-secondary text-secondary-foreground h-10 border-primary">
                Edit Account
              </Button>
            </Link>
            <UserInfoCard user={user} />
            <DeleteAccountCard userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
