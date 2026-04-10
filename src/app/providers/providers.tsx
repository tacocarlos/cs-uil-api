import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";
import { AuthUIProvider } from "@providers/AuthUI";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <AuthUIProvider>{children}</AuthUIProvider>
      <Toaster />
    </TooltipProvider>
  );
}
