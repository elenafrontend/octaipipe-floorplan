# CLAUDE.md

Implementation guide. Read spec.md, architecture.md, decisions.md before coding.

## Dependency rule
- `app → modules/{floorplan, sensors} → core`. One way only.
- `core` imports nothing from `modules/` or `app/`.
- Modules never import each other's internals — only via `index.ts`, sharing `core` types.
  They meet in `app`.

## Principles
- Data stays dumb; meaning lives in the render layer.
- DXF specifics never pass `normalise` — `dxf` is a raw-entity source only.
- Transforms are pure functions (`core/transforms.ts`).
- Model space is the source of truth (metres, Y-up); geometry and sensors join here.
- YAGNI — no abstraction without a second caller.

## Workflow
- TDD where tests earn their keep: model↔screen conversion, selection/polling, one
  interaction path.
- One feature at a time; keep modules black-box.
- GitHub Flow: `main` stays green. Each stage is built on a short-lived `feat/…`
branch and merged back through a PR (no squash, so the staged commits stay
visible in history).
- Within a stage, implement commit by commit: complete a slice, commit it, then
move to the next. Each commit is a small, self-contained step — the stage's
progress reads as an ordered sequence of commits, not one large drop.

## Commit convention

[Angular commit messages](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit):
`type(scope): subject`, e.g. `feat(core): add model↔screen transforms`.
Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.