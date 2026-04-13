import { SiteNavbar } from "@/components/site/site-navbar";
import { Moon } from "lucide-react";
export default function AboutPage() {
  const Href = ({ link }: { link: string }) => (
    <a
      href={link}
      className="bg-primary border-2 border-primary text-primary-foreground px-2 py-1 rounded hover:bg-secondary hover:text-secondary-foreground"
    >
      {link}
    </a>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <div className="m-auto block w-3/4 space-y-5">
        <section>
          <h1 className="text-2xl font-semibold">About This Project</h1>
          <p>
            This project is primarily to provide an easy way to access problem
            problems, since the UIL site seems unuseful in my point of
            view.{" "}
          </p>
          <br />
          <p>
            However, more importantly, this website (in the near future) also
            exposes an API endpoint to programatically retrieve contest/problem
            data. This will allow me to centralize problem uploading, instead of
            having to do it for each problem across all apps that require
            problems.
          </p>
          <br />
          <p>
            I also intend to create SDKs for TypeScript, Python, and Java when I
            get around to actually creating and finalizing the API (so, until
            this part is removed, expect breaking changes to happen pretty
            frequently). For at least the 2026 contest season, consider the API
            to be nonexistent, since it will likely be something I do during the
            summer.
          </p>
          <br />
        </section>
        <section className="space-y-5">
          <h1 className="text-2xl font-semibold">
            Projects That Use This API (or, at least will in the future)
          </h1>
          <div className="space-y-2 border-5 p-3 border-primary rounded">
            <p>
              UILaunch - Java-based CLI for downloading and practicing UIL
              problems
            </p>
            <Href link={"https://github.com/tacocarlos/cs-uilaunch"} />
          </div>
          <div className="space-y-2 border-5 p-3 border-primary rounded">
            <p>Luna UIL - My personal website for my UIL team</p>
            <Href link={"https://github.com/tacocarlos/cs-uil-website"} />
          </div>
        </section>
      </div>
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary">
              <Moon className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-sm font-semibold">Lunar CS</span>
          </div>

          {/* Tagline */}
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            UIL Computer Science Programming Problem Viewer
          </p>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lunar CS
          </p>
        </div>
      </footer>
    </div>
  );
}
