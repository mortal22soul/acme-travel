import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  ...nextVitals,
  ...nextTypescript,
  { rules: { "react-hooks/set-state-in-effect": "off" } },
];

export default config;
