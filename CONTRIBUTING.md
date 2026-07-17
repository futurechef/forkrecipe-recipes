# Contributing to the ForkRecipe dataset

This is the recipe data behind [forkrecipe.com](https://forkrecipe.com) — not the app itself.
Contributions here are recipes: new ones, fixes to existing ones, or forks (variations)
of existing ones. All accepted content is licensed CC BY-SA 4.0, same as everything else
in this repo.

## Before you start

```
git clone https://github.com/futurechef/forkrecipe-recipes
cd forkrecipe-recipes
npm run validate
```

No dependencies to install — the validator is plain Node (see `scripts/validate-recipes.js`).
You should see `✓ 915 recipe(s) valid. No errors.` before you change anything.

## Adding a new recipe

1. Copy `recipes/_template.js` to `recipes/<your-slug>.js` (kebab-case, must match the
   `slug` field exactly — the validator checks this).
2. Fill in every field. The template comments explain each one, including:
   - `category` must be one of the ids in `data/categories.js`
   - `author` must be a key in `data/users.js` — **add yourself there** with your name
     and a `recipesAuthored` count (this repo credits real contributors by name, not
     invented personas — see the note at the top of `users.js`)
   - `flavorRadar` needs all six axes (`sweet salty sour bitter umami heat`), 0–5
   - every `ingredient.role` must be a key in `RoleColor` (`data/schema.js`)
   - every `processNode.inputs` entry must resolve to a real `ingId` or an earlier
     step's `outputState` — this is what drives the ingredient dependency graph
3. Run `npm run validate`. Fix anything it flags before opening a PR.

## Forking an existing recipe

If your recipe is a deliberate variation of one already here (a substitution, a technique
change, a regional twist):

1. Copy the recipe you're forking, not the blank template, and keep its `ingId`s for any
   ingredient you don't change — that's what lets the diff (and, in the live app, the fork
   graph) track exactly what moved.
2. Fill in the `FORK-ONLY FIELDS` block at the bottom of `_template.js`: `parentSlug`,
   a one-line `forkNote` explaining what changed and why, and the `changes` counts.
3. Register the fork in `data/forks.js` — add your slug to
   `FORK_REGISTRY["<parent-slug>"]`.
4. Add a commit entry in `data/commits.js` keyed by your slug — first entry
   `type: "initial"`, message starting `"Fork: ..."`.
5. `npm run validate` — it checks that every fork's `parentSlug` resolves, that it's
   registered in `forks.js`, and warns (not fails) if it's missing from `commits.js`.

## What makes a good PR here

- **Specific over generic.** `instructions` and `visualCue` fields exist so a cook who's
  never made the dish can tell when a step is actually done — "cook until golden" is worse
  than "6–8 minutes, until the edges pull from the pan and it smells nutty, not raw."
- **Real, not scraped.** Content should be your own knowledge/testing or adapted from
  public-domain sources — see the licensing notes in the README. Don't paste in copyrighted
  recipe prose from a commercial site or cookbook still under copyright.
- **One recipe (or one fork) per PR** unless they're genuinely related — makes review sane.

## Questions

Open an issue, or reach out via [LinkedIn](https://www.linkedin.com/in/futurechef/).
