// Recipe validator — run with `npm run validate`.
//
// The app trusts recipe data at runtime (a bad role or missing flavor axis fails
// silently in the UI). This script imports every recipe and asserts it is
// well-formed BEFORE it ships. Reused as the verification gate for content work.
//
// Standalone version for the forkrecipe-recipes dataset repo: the live app
// discovers recipes via Vite's import.meta.glob, which Node has no equivalent
// for, so this script reads the `recipes/` directory from disk instead.

import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename } from "node:path";

import { RoleColor, ActionIcons, FlavorAxes } from "../data/schema.js";
import { CATEGORIES } from "../data/categories.js";
import { USERS } from "../data/users.js";
import { FORK_REGISTRY } from "../data/forks.js";
import { COMMITS } from "../data/commits.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECIPES_DIR = join(__dirname, "..", "recipes");

const VALID_ROLES = new Set(Object.keys(RoleColor));
const VALID_ACTIONS = new Set(Object.keys(ActionIcons));
const VALID_AXES = FlavorAxes.map((a) => a.key);
const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));
const VALID_AUTHORS = new Set(Object.keys(USERS));

const SKIP = new Set(["index.js", "_template.js"]);

// ── load every recipe file ───────────────────────────────────────────────────
const files = readdirSync(RECIPES_DIR).filter(
  (f) => f.endsWith(".js") && !SKIP.has(f),
);

const recipes = {}; // slug -> { recipe, file }
for (const file of files) {
  const mod = await import(pathToFileURL(join(RECIPES_DIR, file)).href);
  const recipe = mod.default;
  recipes[recipe?.slug] = { recipe, file };
}

// ── validation ───────────────────────────────────────────────────────────────
const errors = [];
const warnings = [];
const iconlessActions = new Set(); // actions with no ActionIcons glyph (informational)

for (const file of files) {
  const mod = await import(pathToFileURL(join(RECIPES_DIR, file)).href);
  const r = mod.default;
  const expectedSlug = basename(file, ".js");
  const at = (msg) => errors.push(`${file}: ${msg}`);
  const warn = (msg) => warnings.push(`${file}: ${msg}`);

  if (!r || typeof r !== "object") {
    at("no default export object");
    continue;
  }

  // identity
  if (!r.slug) at("missing `slug`");
  else if (r.slug !== expectedSlug)
    at(`slug "${r.slug}" must match filename "${expectedSlug}"`);

  if (!r.category) at("missing `category`");
  else if (!VALID_CATEGORIES.has(r.category))
    at(`category "${r.category}" not in categories.js`);

  if (!r.author) at("missing `author`");
  else if (!VALID_AUTHORS.has(r.author))
    at(`author "${r.author}" not in users.js`);

  // flavor radar — all six axes
  if (!r.flavorRadar || typeof r.flavorRadar !== "object") {
    at("missing `flavorRadar`");
  } else {
    for (const axis of VALID_AXES) {
      if (typeof r.flavorRadar[axis] !== "number")
        at(`flavorRadar missing numeric axis "${axis}"`);
    }
  }

  // ingredients
  const ingIds = new Set();
  if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
    at("missing or empty `ingredients`");
  } else {
    for (const ing of r.ingredients) {
      if (!ing.ingId) at(`ingredient missing ingId: ${JSON.stringify(ing.name)}`);
      else if (ingIds.has(ing.ingId)) at(`duplicate ingId "${ing.ingId}"`);
      else ingIds.add(ing.ingId);
      if (!VALID_ROLES.has(ing.role))
        at(`ingredient "${ing.name}" has invalid role "${ing.role}"`);
    }
  }

  // process nodes — actions valid, inputs resolve to an ingId or a prior outputState
  const seenStates = new Set();
  if (!Array.isArray(r.processNodes) || r.processNodes.length === 0) {
    at("missing or empty `processNodes`");
  } else {
    for (const node of r.processNodes) {
      // Actions are free-form prose; ActionIcons is an icon lookup with a "●"
      // fallback (ProcessGraph.jsx, CookModePage.jsx). A miss just means no
      // custom glyph — collected and summarized below, never fatal.
      if (node.action && !VALID_ACTIONS.has(node.action))
        iconlessActions.add(node.action);
      for (const input of node.inputs || []) {
        if (!ingIds.has(input) && !seenStates.has(input))
          at(
            `step "${node.nodeId}" input "${input}" is neither an ingId nor a prior outputState`,
          );
      }
      if (node.outputState) seenStates.add(node.outputState);
      // sensory spectrum sanity (warning, not fatal)
      const states = (node.visualCue?.spectrum || []).map((s) => s.state);
      for (const want of ["Underdone", "Perfect", "Overdone"]) {
        if (!states.includes(want))
          warn(`step "${node.nodeId}" spectrum missing "${want}" state`);
      }
    }
  }

  // fork integrity
  if (r.parentSlug) {
    if (!recipes[r.parentSlug])
      at(`parentSlug "${r.parentSlug}" does not resolve to a known recipe`);
    const registered = (FORK_REGISTRY[r.parentSlug] || []).includes(r.slug);
    if (!registered)
      at(
        `fork not registered: add "${r.slug}" to FORK_REGISTRY["${r.parentSlug}"] in forks.js`,
      );
    if (!COMMITS[r.slug])
      warn(`fork "${r.slug}" has no commit history in commits.js`);
  }
}

// ── fork registry back-check: every registered fork must exist ─────────────────
for (const [parent, forks] of Object.entries(FORK_REGISTRY)) {
  if (!recipes[parent])
    errors.push(`forks.js: parent "${parent}" has no recipe file`);
  for (const fork of forks) {
    if (!recipes[fork])
      errors.push(`forks.js: fork "${fork}" (of "${parent}") has no recipe file`);
  }
}

// ── report ─────────────────────────────────────────────────────────────────────
const count = Object.keys(recipes).length;
if (iconlessActions.size) {
  console.log(
    `\nℹ  ${iconlessActions.size} action(s) have no ActionIcons glyph (render ● — fine, just no custom icon):`,
  );
  console.log(`   ${[...iconlessActions].sort().join(", ")}`);
}
if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`   ${w}`);
}
if (errors.length) {
  console.error(`\n✖  ${errors.length} error(s) across ${count} recipe(s):`);
  for (const e of errors) console.error(`   ${e}`);
  console.error("");
  process.exit(1);
}
console.log(`\n✓  ${count} recipe(s) valid. No errors.\n`);
