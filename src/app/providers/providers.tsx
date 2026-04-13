import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthUIProvider } from "@providers/AuthUI";
import { ReactScan } from "./react-scan";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <ReactScan />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <AuthUIProvider>{children}</AuthUIProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </>
  );
}
