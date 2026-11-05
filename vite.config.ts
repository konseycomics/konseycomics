import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";

export default defineConfig({
  resolve: {
    alias: {
      sharp: fileURLToPath(new URL("./cloudflare/free-preview/sharp-disabled.js", import.meta.url)),
    },
  },
  plugins: [
    vinext({ cache: { cdn: staticAssetsAdapter() }, prerender: { routes: "*", concurrency: 2 } }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
