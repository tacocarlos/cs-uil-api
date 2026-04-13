"use client";

import { scan } from "react-scan";
import { type JSX, useEffect } from "react";
import { env } from "@/env";
export function ReactScan(): JSX.Element {
  useEffect(() => {
    if (env.NEXT_PUBLIC_NODE_ENV === "development") {
      scan({ enabled: true });
    }
  }, []);
  return <></>;
}
