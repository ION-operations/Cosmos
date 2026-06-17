import validationSmokeWGSL from "./wgsl/validationSmoke.wgsl?raw";

export class GpuTreeRuntime {
  private device: GPUDevice | null = null;

  async init(): Promise<GPUDevice> {
    if (!navigator.gpu) {
      throw new Error("WebGPU unavailable: navigator.gpu missing.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU unavailable: adapter request failed.");
    }

    this.device = await adapter.requestDevice();
    return this.device;
  }

  async runValidationSmoke(): Promise<number> {
    const device = this.device ?? await this.init();

    const module = device.createShaderModule({ code: validationSmokeWGSL });
    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: "main" }
    });

    const resultBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const readBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: resultBuffer } }]
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(1);
    pass.end();

    encoder.copyBufferToBuffer(resultBuffer, 0, readBuffer, 0, 4);
    device.queue.submit([encoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const value = new Uint32Array(readBuffer.getMappedRange())[0] ?? 0;
    readBuffer.unmap();

    return value;
  }
}
