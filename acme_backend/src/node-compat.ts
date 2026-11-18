import { createRequire } from "node:module";

// jsonwebtoken's transitive dependency expects SlowBuffer, removed in Node 26.
const require = createRequire(import.meta.url);
const buffer = require("node:buffer");
if (!buffer.SlowBuffer) buffer.SlowBuffer = buffer.Buffer;
