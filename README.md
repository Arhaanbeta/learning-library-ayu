# Learning Library

Our family's learning material in one place: https://arhaanbeta.github.io/learning-library-ayu/

## Add a lesson
1. Pick the section folder, e.g. `content/physics/forces/`.
2. Add a file like `04-gravity.mdx` with frontmatter (copy one of the existing pages). Give it a new, unique `id`; never change an `id` later.
3. Commit to `main`. The site updates about a minute later.

Lessons can use `<KeyIdea>`, `<Tip>`, `<Remember>`, `<Warning>`, `<RealWorld>`, `<Figure>`, `<Sim>` and `<Code>` without importing anything, and maths with `$…$` or `$$…$$`.

## Run it on a computer
```sh
npm ci
npm run dev      # http://localhost:4321/learning-library-ayu/
npm run check    # types and content
npm run build    # the full site, into dist/
```

How everything fits together: see [CLAUDE.md](CLAUDE.md).
