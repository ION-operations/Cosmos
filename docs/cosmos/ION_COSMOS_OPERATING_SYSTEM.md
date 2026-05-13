# Cosmos Operating System — ION-derived build workflow

Cosmos is now treated as a governed visual-engine project, not a loose pile of shader branches. The ION math sandbox is adapted here as a practical engineering loop: define domains, assign agents, make a packet, validate it, and issue a receipt.

## Core loop

1. **Observation** — lead eyes identifies a realism failure: cloud repetition, water color, foam scale, atmospheric rim, etc.
2. **Domain routing** — the issue is routed to one or more domains in `COSMOS_DOMAIN_REGISTRY.json`.
3. **Agent pass** — the relevant agent from `COSMOS_AGENT_ROSTER.json` proposes a bounded change.
4. **Implementation packet** — code/doc changes are applied in a small, reviewable unit.
5. **Validation** — run build/tests and, when possible, visual A/B review.
6. **Receipt** — record what changed, what passed, what is still uncertain.
7. **Next queue** — promote unresolved problems to `COSMOS_QUEUE.json`.

## Domain expansion rule

Add a domain only when an existing domain cannot produce clear ownership. A good Cosmos domain has:

- a visual target;
- measurable artifacts or screenshots;
- implementation files it owns;
- validation criteria;
- known failure modes.

## Current first priority

**Water World Earth v0.1**: create a believable sea-level-to-orbit experience by replacing uniform procedural cloud placement with a weather atlas spine and by making local ocean response read that macro weather state.
