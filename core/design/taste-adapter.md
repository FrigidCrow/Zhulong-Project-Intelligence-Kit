# Zhulong Taste Adapter

Purpose: apply the vendored `design-taste-frontend` guidance only when project
evidence permits visual invention. The upstream snapshot is reference material;
this adapter is the runtime contract.

## Authority Order

1. Explicit user direction.
2. Specifications, approved designs, brand guidance, and Figma evidence.
3. Compliance, accessibility, performance, and platform constraints.
4. Existing source conventions, design tokens, components, and dependencies.
5. This adapter and the vendored Taste guidance.
6. Unconstrained model preference.

Never use Taste to silently replace a stronger source of truth.

## Configuration

Read `frontend_design` from `project.manifest.yml` when present:

```yaml
frontend_design:
  strategy: auto       # auto | preserve | evolve | create | system
  taste: auto          # auto | enabled | disabled
```

An explicit user instruction overrides the manifest. Missing configuration is
equivalent to `auto` / `auto`.

## Design Mode Routing

- `create`: no established visual language and the surface is a landing page,
  public website, portfolio, editorial page, or approved overhaul. Apply Taste
  fully after declaring the Design Read and three dials.
- `evolve`: recognizable but incomplete or inconsistent project style. Use
  existing tokens and components as the baseline; Taste may improve hierarchy,
  spacing, composition, imagery, responsiveness, and restrained motion.
- `preserve`: stable tokens, component library, approved designs, or brand
  guidance exist. Taste is audit-only. Do not introduce a new font, palette,
  radius system, component library, icon family, or motion dependency without
  explicit approval.
- `system`: dashboard, admin, dense data UI, table-heavy workflow, multi-step
  product flow, or regulated operational surface. Disable marketing-page Taste
  rules and follow the existing or selected product design system.

If `strategy` is explicit, use it. If `taste` is `disabled`, set
`taste_applied: disabled`. If it is `enabled`, apply Taste only within the
chosen mode; it does not turn `preserve` or `system` into `create`.

When automatic evidence supports materially different modes and confidence is
low, ask exactly one design-direction question before implementation.

## Frontend Design Decision

`zl-ui-phase` first computes this block from the manifest, request, dependency
manifest, and bounded project-path evidence. Before frontend implementation,
verify it against brand/design evidence, complete any missing product detail,
and keep the final block in the UI context or active phase record:

```yaml
mode: preserve | evolve | create | system
confidence: high | medium | low
taste_applied: full | constrained | audit-only | disabled
evidence:
  - design documents
  - tokens and component libraries
  - existing screens and assets
preserve:
  - brand tokens
  - component APIs
  - routes and navigation
  - analytics identifiers
allowed_changes: []
design_read:
  page_kind: ""
  audience: ""
  visual_language: ""
dials:
  design_variance: 1
  motion_intensity: 1
  visual_density: 1
verification: []
```

For `create` and `evolve`, provide a one-line Design Read. Set each dial from
evidence rather than silently using the upstream baseline. For `preserve`,
infer the existing dials. For `system`, dials may describe density but do not
activate marketing-page patterns.

## Rule Tiers

Always applicable when relevant:

- responsive layouts and explicit mobile collapse;
- keyboard access, contrast, focus, reduced-motion, and semantic states;
- loading, empty, error, success, and disabled states when the product has them;
- dependency verification, cleanup, image sizing, and performance checks;
- consistent tokens and one component/design system per surface.

Marketing-only guidance for `create` or approved `evolve` surfaces:

- anti-template composition, deliberate typography, coherent imagery, concise
  hero structure, layout rhythm, and motivated motion;
- the relevant upstream pre-flight checks for the actual page type.

Project-overridable upstream preferences:

- React, Next.js, Tailwind, Motion, font and icon recommendations;
- mandatory dark mode, image quantity, punctuation bans, exact hero limits,
  aesthetic palette bans, and specific layout prohibitions.

These preferences never justify changing the existing stack or brand by
themselves.

## Verification Contract

- `preserve`: diff tokens, fonts, dependencies, component APIs, routes, labels,
  analytics hooks, and representative screenshots for unintended drift.
- `evolve`: prove preserved brand elements and verify each allowed visual change.
- `create`: run the relevant Taste pre-flight plus responsive, accessibility,
  reduced-motion, performance, and screenshot checks.
- `system`: verify task completion, data density, states, keyboard flow, and the
  selected product design system; do not score it as a marketing page.
- All modes: record what was checked, what was not checked, residual risk, and
  rollback notes in Zhulong evidence.

## Upstream Reference

- Snapshot: `third_party/taste-skill/SKILL.md`
- Provenance: `third_party/taste-skill/UPSTREAM.md`
- The snapshot is never updated automatically and is never loaded as a second,
  competing runtime skill.
