export type WebGpuStatus =
  | { ok: true; adapterInfo: string }
  | { ok: false; reason: string };

export async function detectWebGpu(): Promise<WebGpuStatus> {
  if (!("gpu" in navigator)) {
    return { ok: false, reason: "navigator.gpu is unavailable in this browser." };
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    return { ok: false, reason: "WebGPU adapter request failed." };
  }

  return { ok: true, adapterInfo: "WebGPU adapter acquired." };
}
