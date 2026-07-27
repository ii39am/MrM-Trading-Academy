import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({test:{environment:"node",include:["tests/unit/**/*.test.ts","tests/integration/**/*.test.ts"],setupFiles:["tests/setup-env.ts"],clearMocks:true,fileParallelism:false},resolve:{alias:{"@":path.resolve(__dirname,".")}}});
