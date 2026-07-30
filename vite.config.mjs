import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { openAIAnalysisPlugin } from "./server/viteOpenAIPlugin.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [openAIAnalysisPlugin(env), react()],
  };
});
