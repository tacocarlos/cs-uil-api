import { SiteNavbar } from "@/components/site/site-navbar";
import { AccountView } from "@daveyplate/better-auth-ui";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="space-y-5">
      <SiteNavbar />
      <div className="w-3/4 block m-auto">
        <AccountView path={path} />
      </div>
    </main>
  );
}
