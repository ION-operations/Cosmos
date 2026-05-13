export const COSMOS_RUNTIME_DIAGNOSTICS_MODEL = 'R0011-runtime-shader-clean-calibration';
export const COSMOS_RUNTIME_DIAGNOSTICS_MAX_LOGS = 200;

export type CosmosRuntimeDiagnosticsStateKind = 'ok' | 'warning' | 'error' | 'unknown';
export type CosmosRuntimeMessageKind = 'console' | 'pageerror' | 'webgl-shader' | 'webgl-program' | 'webgl-context';

export interface CosmosRuntimeLogEntry {
  kind: CosmosRuntimeMessageKind;
  type: string;
  text: string;
  timeMs?: number;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  shaderType?: 'vertex' | 'fragment' | 'unknown';
  shaderHash?: string;
}

export interface CosmosRuntimeMessageCounts {
  total: number;
  errors: number;
  warnings: number;
  shaderErrors: number;
  shaderWarnings: number;
  programErrors: number;
  programWarnings: number;
  pageErrors: number;
  contextLosses: number;
}

export interface CosmosWebGlProbeStats {
  installed: boolean;
  shaderCompiles: number;
  shaderWarnings: number;
  shaderErrors: number;
  programLinks: number;
  programWarnings: number;
  programErrors: number;
  maxShaderLogLength: number;
  maxProgramLogLength: number;
}

export interface CosmosRendererDiagnostics {
  isWebGL2: boolean;
  precision: string;
  logarithmicDepthBuffer: boolean;
  maxTextures: number;
  maxTextureSize: number;
  maxVertexTextures: number;
  vertexTextures: boolean;
  floatFragmentTextures: boolean;
  maxAnisotropy: number;
  checkShaderErrors: boolean;
  programCount: number;
  memoryGeometries: number;
  memoryTextures: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
}

export interface CosmosRuntimeDiagnosticsState {
  state: CosmosRuntimeDiagnosticsStateKind;
  model: string;
  generatedAtIso: string;
  bookmarkId?: string;
  debugMode?: number;
  renderer: CosmosRendererDiagnostics;
  webglProbe: CosmosWebGlProbeStats;
  messages: CosmosRuntimeLogEntry[];
  counts: CosmosRuntimeMessageCounts;
  context: {
    lost: boolean;
    lostCount: number;
    restoredCount: number;
  };
  message: string;
}

export const createEmptyWebGlProbeStats = (): CosmosWebGlProbeStats => ({
  installed: false,
  shaderCompiles: 0,
  shaderWarnings: 0,
  shaderErrors: 0,
  programLinks: 0,
  programWarnings: 0,
  programErrors: 0,
  maxShaderLogLength: 0,
  maxProgramLogLength: 0,
});

export const createEmptyRendererDiagnostics = (): CosmosRendererDiagnostics => ({
  isWebGL2: false,
  precision: 'unknown',
  logarithmicDepthBuffer: false,
  maxTextures: 0,
  maxTextureSize: 0,
  maxVertexTextures: 0,
  vertexTextures: false,
  floatFragmentTextures: false,
  maxAnisotropy: 0,
  checkShaderErrors: true,
  programCount: 0,
  memoryGeometries: 0,
  memoryTextures: 0,
  calls: 0,
  triangles: 0,
  points: 0,
  lines: 0,
});

export const hashCosmosRuntimeText = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const isWarningText = (text: string) => /\bwarning\b|\bprecision\b|\bdeprecated\b/i.test(text);
const isErrorText = (text: string) => /\berror\b|failed|invalid|could not|compile error|compilation error|link error|link failed/i.test(text);

export const createCosmosRuntimeLogEntry = (entry: CosmosRuntimeLogEntry): CosmosRuntimeLogEntry => ({
  ...entry,
  text: entry.text.length > 2600 ? `${entry.text.slice(0, 2600)}…` : entry.text,
  timeMs: entry.timeMs ?? Date.now(),
  shaderHash: entry.shaderHash ?? (entry.kind === 'webgl-shader' || entry.kind === 'webgl-program' ? hashCosmosRuntimeText(entry.text) : undefined),
});

export const countCosmosRuntimeMessages = (messages: CosmosRuntimeLogEntry[]): CosmosRuntimeMessageCounts => {
  let errors = 0;
  let warnings = 0;
  let shaderErrors = 0;
  let shaderWarnings = 0;
  let programErrors = 0;
  let programWarnings = 0;
  let pageErrors = 0;
  let contextLosses = 0;

  for (const entry of messages) {
    const type = entry.type.toLowerCase();
    const text = entry.text;
    const explicitError = type === 'error' || type === 'pageerror' || isErrorText(text);
    const explicitWarning = type === 'warning' || type === 'warn' || isWarningText(text);
    if (explicitError) errors++;
    else if (explicitWarning) warnings++;

    if (entry.kind === 'pageerror') pageErrors++;
    if (entry.kind === 'webgl-context') contextLosses++;
    if (entry.kind === 'webgl-shader') {
      if (explicitError) shaderErrors++;
      else shaderWarnings++;
    }
    if (entry.kind === 'webgl-program') {
      if (explicitError) programErrors++;
      else programWarnings++;
    }
  }

  return { total: messages.length, errors, warnings, shaderErrors, shaderWarnings, programErrors, programWarnings, pageErrors, contextLosses };
};

export const classifyCosmosRuntimeDiagnostics = (counts: CosmosRuntimeMessageCounts, contextLost: boolean): CosmosRuntimeDiagnosticsStateKind => {
  if (contextLost || counts.shaderErrors > 0 || counts.programErrors > 0 || counts.pageErrors > 0) return 'error';
  if (counts.errors > 0) return 'error';
  if (counts.shaderWarnings > 0 || counts.programWarnings > 0 || counts.warnings > 0 || counts.contextLosses > 0) return 'warning';
  return 'ok';
};

export interface CreateRuntimeDiagnosticsStateInput {
  renderer?: Partial<CosmosRendererDiagnostics>;
  webglProbe?: Partial<CosmosWebGlProbeStats>;
  messages?: CosmosRuntimeLogEntry[];
  context?: Partial<CosmosRuntimeDiagnosticsState['context']>;
  bookmarkId?: string;
  debugMode?: number;
}

export const createCosmosRuntimeDiagnosticsState = ({
  renderer,
  webglProbe,
  messages = [],
  context,
  bookmarkId,
  debugMode,
}: CreateRuntimeDiagnosticsStateInput = {}): CosmosRuntimeDiagnosticsState => {
  const trimmedMessages = messages.map(createCosmosRuntimeLogEntry).slice(-COSMOS_RUNTIME_DIAGNOSTICS_MAX_LOGS);
  const counts = countCosmosRuntimeMessages(trimmedMessages);
  const contextState = {
    lost: context?.lost ?? false,
    lostCount: context?.lostCount ?? 0,
    restoredCount: context?.restoredCount ?? 0,
  };
  const state = classifyCosmosRuntimeDiagnostics(counts, contextState.lost);
  return {
    state,
    model: COSMOS_RUNTIME_DIAGNOSTICS_MODEL,
    generatedAtIso: new Date().toISOString(),
    bookmarkId,
    debugMode,
    renderer: { ...createEmptyRendererDiagnostics(), ...renderer },
    webglProbe: { ...createEmptyWebGlProbeStats(), ...webglProbe },
    messages: trimmedMessages,
    counts,
    context: contextState,
    message: state === 'ok'
      ? 'No browser console, WebGL shader, program-link, or context-loss failures recorded.'
      : state === 'warning'
        ? 'Warnings recorded; inspect shader/program logs before beauty tuning.'
        : 'Runtime failure recorded; block visual tuning until shader/program/page errors are resolved.',
  };
};

declare global {
  interface Window {
    __COSMOS_RUNTIME_DIAGNOSTICS__?: CosmosRuntimeDiagnosticsState;
    __COSMOS_WEBGL_PROBE__?: {
      stats?: Partial<CosmosWebGlProbeStats>;
      logs?: CosmosRuntimeLogEntry[];
      clear?: () => void;
    };
  }
}
