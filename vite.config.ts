import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import { presetUno, presetIcons } from "unocss";

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [
    UnoCSS({
      presets: [presetUno(), presetIcons()],
    }),
  ],
});
