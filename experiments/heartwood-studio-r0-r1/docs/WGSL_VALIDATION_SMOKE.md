# WGSL validation smoke pass

The raw WGSL file should live at:

`src/gpu/wgsl/validationSmoke.wgsl`

The GitHub contents API blocked direct creation of the WGSL file in this session. Required content:

```wgsl
@group(0) @binding(0) var<storage, read_write> result: array<u32>;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  result[0] = 1u;
}
```

This proves the R0 runtime contract: compile WGSL, bind a storage buffer, dispatch one compute workgroup, copy result to a readback buffer, and read a validation status value.
