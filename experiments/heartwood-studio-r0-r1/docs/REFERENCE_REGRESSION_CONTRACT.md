# Heartwood Reference Regression Contract

## Purpose

The validation gates are not allowed to become lower standards than the reference material already supplied.

A gate is not a success condition by itself. A gate is only valid when it proves that a candidate preserves or exceeds the strongest known reference for that aspect.

## Non-negotiable rule

No Heartwood candidate may be promoted if it passes an abstract structural gate while regressing a reference-backed capability.

Examples:

- A branch can pass `graph_authority_gate` and still fail promotion if its silhouette is worse than the supplied CODEX or Heartwood references.
- A union can pass `junction_continuity_gate` and still fail promotion if it loses collar/ridge/embedded-child features from the references.
- A bark material can pass a topology gate and still fail if it collapses species-specific bark into generic noise.
- A foliage mode can pass instance-count checks and still fail if willow becomes generic broadleaf, pine becomes green billboard cards, or acacia loses umbrella habit.

## Required gate stack

Every aspect must pass three layers:

1. **Authority gate** — the generated element is owned by TreeGraph / SpeciesProfile / material state.
2. **Reference parity gate** — the candidate preserves the known features from accepted references.
3. **Regression gate** — the candidate is not worse than the strongest prior artifact for that aspect.

Only then can an aspect be marked promotable.

## Strongest known reference classes

| Aspect | Baseline sources | Must preserve |
|---|---|---|
| branch architecture | CODEX5.3, Heartwood R4/R5, aspect workbench | scaffold rhythm, non-flat terminals, species silhouette, dead/broken limb support |
| trunk/Leader | Tree Kernel brief, HyperTree plan, CODEX trunk gestures | continuous order-0 Leader, trunk gesture knots, taper, ovality, fluting, root flare |
| junction/collar | Tree Kernel brief, HyperTree plan, CODEX collar params | buried child base, collar ridge, compression shoulder, no glued tube, no spherical blob |
| endpoints/damage | CODEX cut/splinter masks, Heartwood R5 | endpoint taxonomy, snapped limbs, old cuts, scars, splinters, no arbitrary flat caps |
| roots/buttress | Earth/Tree kernel docs, CODEX root params | root emergence from trunk mass, buttress/root flare, ground entry, crawl roots |
| bark | reference boards, CODEX bark noise, Tree Kernel tissue plan | species-specific bark, relief, anisotropy, topology tie-in, future tissue fields |
| foliage | CODEX foliage params, image references | species-specific leaves/needles/strands, not generic green mass |
| wind/load | Tree Kernel brief, CODEX wind params | parent/order coupling, rotation-driven motion, sag/load memory, leaf-only flutter |
| soil/root/hydro | Earth Kernel brief, FlowGuide-MPM notes | future boundary only; no fake global heightfield replacement |

## Promotion language

Use these statuses:

- `blocked` — cannot compare to references yet.
- `regressed` — candidate is worse than a known reference.
- `parity` — candidate preserves reference features but does not improve them.
- `improved` — candidate exceeds reference features while preserving them.
- `promotable` — candidate passes authority, parity, and regression gates.

## Absolute guarantee policy

There is no honest absolute guarantee from a scaffold alone. The guarantee we can enforce is procedural:

A candidate is forbidden from being called complete, promoted, or merged until its reference parity report is attached and no known stronger reference has been regressed.

This turns the references into hard promotion law rather than optional inspiration.
