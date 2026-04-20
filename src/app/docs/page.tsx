import { redirect } from "next/navigation";
export default function Docs() {
  redirect("/api/openapi");
}

// import { SiteNavbar } from "@/components/site/site-navbar";
// import { Moon } from "lucide-react";
// export default function DocHomePage() {
//   return (
//     <div className="flex min-h-screen flex-col">
//       <SiteNavbar />
//       <div className="m-auto block text-xl">
//         <p>Not created yet, come back later!</p>
//       </div>
//       <footer className="border-t border-border/60 bg-background">
//         <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
//           {/* Brand */}
//           <div className="flex items-center gap-2">
//             <div className="flex size-6 items-center justify-center rounded-md bg-primary">
//               <Moon className="size-3.5 text-primary-foreground" />
//             </div>
//             <span className="font-heading text-sm font-semibold">Lunar CS</span>
//           </div>

//           {/* Tagline */}
//           <p className="text-center text-xs text-muted-foreground sm:text-left">
//             UIL Computer Science Programming Problem Viewer
//           </p>

//           {/* Copyright */}
//           <p className="text-xs text-muted-foreground">
//             © {new Date().getFullYear()} Lunar CS
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }
