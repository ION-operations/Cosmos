# Graph-First Recovery Protocol

## Problem

The existing Heartwood Parameter Graph Atlas already exists and must be treated as the primary inventory.

The correct operation is not to invent a new scaffold baseline. The correct operation is to import the existing graph, preserve its parameter and relationship set, then diff every new implementation file against it.

## Source of truth

Primary inventory:

- `heartwood_parameter_graph_atlas_v0_3.html`
- counts: 790 raw rows, 665 unique parameters, 695 graph nodes, 1539 relationships
- generated from parameter audit CSV, Lab L growth ecology, developer specimen boards, and reference docs/zips

Supporting source packages:

- CODEX5.3TREES
- Procedural_trees_rocks / HyperTree
- Heartwood R4/R5 labs
- Heartwood Aspect Workbench v0.1-v0.4
- Tree Kernel / HyperTree / Earth Kernel plans
- visual reference boards

## Freeze rule

No further feature implementation is promotable until the graph inventory is materialized into the repo as machine-readable data.

## Required next artifacts

1. `src/inventory/parameterGraphSnapshot.ts`
   - imported graph counts
   - system nodes
   - visual target nodes
   - route/domain labels
   - high-priority relationships

2. `src/inventory/scaffoldCoverage.ts`
   - compares current scaffold files against required graph aspects
   - marks `present`, `partial`, `missing`, or `regressed`

3. `docs/PARAMETER_RELATIONSHIP_DIFF_R0.md`
   - every aspect category
   - expected inventory count where available
   - what the scaffold currently covers
   - what is missing
   - what is forbidden to call complete

## Decision rule

If the full graph cannot be imported because of connector limits, the minimum valid fallback is a staged materialization:

- Stage A: system nodes and graph counts
- Stage B: visual targets
- Stage C: top-priority parameter families
- Stage D: all 665 canonical parameters
- Stage E: all 1539 relationships

A stage may be incomplete, but it must be labeled incomplete. It cannot be called full coverage.

## Correct build order from here

1. Import graph atlas inventory.
2. Diff scaffold coverage against graph atlas.
3. Mark every missing parameter family.
4. Mark every missing relationship family.
5. Only then continue workbench/gate implementation.

## Hard statement

The graph atlas is above the new scaffold. Any scaffold file that conflicts with, omits, or weakens the graph atlas is the thing that must change.
