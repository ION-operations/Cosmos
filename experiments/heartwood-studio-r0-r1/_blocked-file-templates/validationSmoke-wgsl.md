# Template: validationSmoke.wgsl

Create this file at:

`experiments/heartwood-studio-r0-r1/src/gpu/wgsl/validationSmoke.wgsl`

Use this content:

```text
@group(0) @binding(0) var<storage, read_write> result: array<u32>;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  result[0] = 1u;
}
```

This is a harmless R0 smoke pass. It writes `1u` into a validation buffer so the runtime can prove WGSL compile, dispatch, copy, and readback. It is stored here as Markdown because the connector blocked direct creation of raw WGSL.
