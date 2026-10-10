// Type-sync pipeline (run via tsx).
//
// The backend has NO OpenAPI; request validation is internal Zod in
// packages/backend/src/validators/api.ts (only deps: zod + a leaf domain.ts).
// We import those schemas and emit a language-agnostic JSON Schema IR:
//
//   backend Zod  --(zod-to-json-schema, here)-->  src/_generated/schema.json
//                --> TS (hand types in src/types.ts, verified against this + live prod)
//                --> Python pydantic (datamodel-code-generator, consumes schema.json)
//                --> Go structs (quicktype, consumes schema.json)
//
// Env: BACKEND_DIR = path to packages/backend (default: ../termix-aacp-platform-dev-v2/packages/backend)
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";

const here = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = process.env.BACKEND_DIR || resolve(here, "../../termix-aacp-platform-dev-v2/packages/backend");
const apiPath = resolve(BACKEND_DIR, "src/validators/api.ts");

if (!existsSync(apiPath)) {
  console.error(`[gen-types] validators not found: ${apiPath}`);
  console.error("[gen-types] set BACKEND_DIR to the monorepo backend package.");
  process.exit(2);
}

const mod: Record<string, unknown> = await import(apiPath);

const isZod = (v: unknown): v is { _def: unknown; safeParse: unknown } =>
  typeof v === "object" && v !== null && "_def" in v && "safeParse" in v;

const definitions: Record<string, unknown> = {};
const skipped: string[] = [];
let count = 0;
for (const [name, value] of Object.entries(mod).sort(([a], [b]) => a.localeCompare(b))) {
  if (!name.endsWith("Schema") || !isZod(value)) continue;
  try {
    definitions[name] = zodToJsonSchema(value as never, { $refStrategy: "none", target: "jsonSchema7" });
    count += 1;
  } catch (err) {
    skipped.push(`${name}: ${(err as Error).message}`);
  }
}

const outDir = resolve(here, "../src/_generated");
mkdirSync(outDir, { recursive: true });
const artifact = {
  $schema: "http://json-schema.org/draft-07/schema#",
  "x-source": "termix platform backend validators/api.ts (Zod)",
  "x-note": "Generated IR — do not edit by hand. Regenerate with `pnpm gen:types`.",
  definitions,
};
const replacer = (_key: string, value: unknown): unknown =>
  typeof value === "bigint" ? value.toString() : value;
writeFileSync(resolve(outDir, "schema.json"), JSON.stringify(artifact, replacer, 2) + "\n");

console.log(`[gen-types] wrote src/_generated/schema.json — ${count} schemas`);
if (skipped.length) console.warn(`[gen-types] skipped ${skipped.length}:\n  ${skipped.join("\n  ")}`);
