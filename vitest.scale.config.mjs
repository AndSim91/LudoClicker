// Scale benchmarks (plan, Fase 7): `npm run test:scale`. Excluded from the normal suite.
import base from "./vite.config.ts";

export default {
  ...base,
  test: {
    ...base.test,
    include: ["src/game/extremeScale.test.ts"],
    exclude: [],
    env: { RUN_EXTREME_SCALE_BENCHMARK: "1" },
  },
};
