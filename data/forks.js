export const FORK_REGISTRY = {
  "neapolitan-pizza-dough": [
    "sourdough-pizza-dough",
  ],
  "thai-green-curry-paste": [
    "vegan-green-curry-paste",
  ],
  // The Mother Sauces fork tree — daughter sauces derived from the five roots.
  "bechamel": [
    "mornay",
    "soubise",
  ],
  "veloute": [
    "allemande",
    "sauce-supreme",
  ],
  "espagnole": [
    "demi-glace",
  ],
  // Espagnole → Demi-Glace → Robert: a real three-level brown-sauce lineage
  // (Robert is built on demi-glace, not directly on the mother espagnole).
  "demi-glace": [
    "sauce-robert",
  ],
  "hollandaise": [
    "bearnaise",
  ],
  // Two-level lineage: choron forks béarnaise, which forks hollandaise.
  "bearnaise": [
    "choron",
  ],
};

export function getForksOf(slug) {
  return FORK_REGISTRY[slug] || [];
}

export function getParentOf(slug, recipes) {
  const recipe = recipes[slug];
  return recipe?.parentSlug || null;
}

/**
 * Walk a recipe's fork lineage recursively and flatten it into render-ready
 * rows for a `git log --graph`-style ASCII tree. Each row carries its resolved
 * recipe object plus the `git`-style glyph prefix ("├── ", "│   └── ", …)
 * computed from its depth and last-child position.
 *
 * @param {string} rootSlug                slug of the mother recipe
 * @param {(slug:string)=>any} resolve     slug -> recipe object (null if unknown)
 * @param {(slug:string)=>string[]} childrenOf  slug -> child fork slugs (built-in + community)
 * @param {number} maxDepth                generations of forks to descend (default 3)
 * @returns {Array<{ slug, recipe, depth, prefix, isMother }>}
 */
export function buildLineageTree(rootSlug, resolve, childrenOf, maxDepth = 3) {
  const rows = [];
  const visited = new Set();

  // ancestors: per-level flag of whether more siblings follow at that level,
  // used to draw the continuation "│" vs blank gutter for deeper generations.
  function walk(slug, depth, isLast, ancestors) {
    if (visited.has(slug)) return; // cycle guard
    visited.add(slug);

    const recipe = resolve(slug);

    let prefix;
    if (depth === 0) {
      prefix = "● ";
    } else {
      let gutter = "";
      for (const ancestorHasMore of ancestors) {
        gutter += ancestorHasMore ? "│   " : "    ";
      }
      prefix = gutter + (isLast ? "└── " : "├── ");
    }

    rows.push({ slug, recipe, depth, prefix, isMother: depth === 0 });

    if (depth >= maxDepth) return;

    const children = childrenOf(slug);
    children.forEach((childSlug, i) => {
      const childIsLast = i === children.length - 1;
      walk(childSlug, depth + 1, childIsLast, [...ancestors, !isLast]);
    });
  }

  walk(rootSlug, 0, true, []);
  return rows;
}
