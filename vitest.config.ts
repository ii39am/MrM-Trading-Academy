import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({esbuild:{jsx:"automatic"},test:{environment:"node",include:["tests/unit/**/*.test.{ts,tsx}","tests/integration/**/*.test.{ts,tsx}"],setupFiles:["tests/setup-env.ts"],clearMocks:true,fileParallelism:false},resolve:{alias:{"@":path.resolve(__dirname,".")}}});
