import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const LEGACY_BRAND_ASSET =
  "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

function localBrandAsset(): Plugin {
  return {
    name: "segempat-local-brand-asset",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/src/") || !code.includes(LEGACY_BRAND_ASSET)) return null;
      return {
        code: code.replaceAll(LEGACY_BRAND_ASSET, "/empat-logo.svg"),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    localBrandAsset(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
