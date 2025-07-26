import { defineConfig, presetUno, presetIcons } from "unocss";

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  rules: [
    [
      "no-drag",
      {
        "-webkit-user-drag": "none",
        "user-drag": "none",
      },
    ],
  ],
});
