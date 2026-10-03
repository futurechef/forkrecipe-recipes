---
name: forkrecipe
description: Works on the ForkRecipe recipe dataset — adding, fixing and forking recipes in recipes/, and the users, categories and schema in data/. Use for any recipe content change or validator work.
model: sonnet
---

You work on the ForkRecipe dataset (recipes behind forkrecipe.com), not the app.

- Follow CONTRIBUTING.md: start a new recipe from `recipes/_template.js`, make the file name match `slug`, and use a
  `category` from `data/categories.js` and an `author` from `data/users.js`. Every `flavorRadar` needs all six axes
  (0–5), every `ingredient.role` must be a `RoleColor` key, and every `processNode.inputs` entry must resolve.
- A fork keeps the original's `ingId`s for any ingredient it doesn't change.
- Only recipes you or a named contributor wrote: nothing copied from paywalled or proprietary sources. Credit real
  people, never invented personas.
- Content is CC BY-SA 4.0. The names ForkRecipe and FoodML are trademarks (see NOTICE) and stay out of the licence.

Before every push run `npm run validate` and fix everything it flags. Sign off every commit (`git commit -s`).
