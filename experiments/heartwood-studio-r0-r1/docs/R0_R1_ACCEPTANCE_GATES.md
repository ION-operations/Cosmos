# R0/R1 Acceptance Gates

## graph_authority_gate

Every rendered branch/root/twig must correspond to a TreeNode. Renderer-only limbs are forbidden.

## leader_continuity_gate

The trunk is the order-0 Leader and continues into the crown. It is not a separate tube capped at trunkTopY.

## endpoint_state_gate

Every terminal node has a biological endpoint state.

Allowed terminal states:

- leader_continuation
- living_tip
- dormant_bud
- twig_fan
- leaf_terminal
- needle_terminal
- dead_stub
- snapped_limb
- old_cut
- scarred_cut
- rot_cavity
- occluded_terminal

## flat_cap_gate

Flat caps are invalid except when the endpoint is an explicit old_cut or scarred_cut with matching cut/scar material state.

## junction_continuity_gate

Child branches must be buried into parent mass through a UnionZone. Blob inflation is a failure.
