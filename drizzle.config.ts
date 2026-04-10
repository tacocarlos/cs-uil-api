import type { Config } from "drizzle-kit";

import { env } from "@/env";

export default {
  schema: "./src/server/db/schemas",
  dialect: "turso",
  dbCredentials: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  tablesFilter: ["cs-uil-api_*"],
} satisfies Config;
