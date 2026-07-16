import { HarvestedPlan, HarvestedPrereq, SharedPlanPayload, Subject } from '@/types/curriculum';

function parseLegacyPrereqList(raw: string | null): HarvestedPrereq[] {
  if (!raw) return [];
  const result: HarvestedPrereq[] = [];
  const re = /\(([^,()]+),\s*([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const conditionText = match[2].trim().toLowerCase();
    result.push({
      id: match[1].trim(),
      condition: conditionText.includes('regular') ? 'Regularizada' : 'Aprobada',
    });
  }
  return result;
}

function coerceLegacyPlan(subjects: Subject[]): HarvestedPlan {
  return {
    meta: {
      source: 'legacy-json',
      generatedAt: new Date().toISOString(),
    },
    subjects: subjects.map((s) => ({
      course: s.Course,
      id: s.ID,
      module: typeof s.Year === 'number' ? `${s.Year} Año` : String(s.Year),
      year: s.Year === 'Electives' ? 'Electives' : typeof s.Year === 'number' ? s.Year : null,
      credits: s.Credits,
      nota: null,
      origen: null,
      prerequisitesToTake: parseLegacyPrereqList(s['Prerequisites to Take']),
      prerequisitesToPass: parseLegacyPrereqList(s['Prerequisites to Pass']),
      prerequisiteToTakeFor: parseLegacyPrereqList(s['Prerequisite to Take for']),
      prerequisiteToPassFor: parseLegacyPrereqList(s['Prerequisite to Pass for']),
    })),
  };
}

/** Valida (mínimamente) que el objeto parseado sea un HarvestedPlan. */
export function coercePlan(data: unknown): HarvestedPlan {
  const obj = data as any;
  if (Array.isArray(obj)) {
    return coerceLegacyPlan(obj as Subject[]);
  }
  if (!obj || !Array.isArray(obj.subjects)) {
    throw new Error('El JSON no tiene la forma esperada (falta "subjects").');
  }
  return obj as HarvestedPlan;
}

/** Parsea el JSON crudo que produce el harvester. */
export function parseHarvestedText(text: string): HarvestedPlan {
  return coercePlan(JSON.parse(text));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64ToBytes(b64: string): Uint8Array {
  // Soporta base64url (- _) además de base64 estándar.
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const bin = atob(normalized);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encodeCompressedJson(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const gz = await new Response(
    new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
  ).arrayBuffer();
  return bytesToBase64Url(new Uint8Array(gz));
}

async function decodeCompressedJson(payload: string): Promise<unknown> {
  const bytes = base64ToBytes(decodeURIComponent(payload));
  const stream = new Response(
    new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  );
  return JSON.parse(await stream.text());
}

/** Descomprime un payload gzip+base64 (el que arma el bookmarklet) y lo parsea. */
export async function decodeCompressedPlan(payload: string): Promise<HarvestedPlan> {
  return coercePlan(await decodeCompressedJson(payload));
}

export interface PlanImportBundle {
  plan: HarvestedPlan;
  userState?: SharedPlanPayload['userState'];
}

function coerceSharedPlanPayload(data: unknown): SharedPlanPayload {
  const obj = data as Partial<SharedPlanPayload>;
  if (!obj || obj.version !== 1 || !obj.plan) {
    throw new Error('El link compartido no tiene la forma esperada.');
  }
  return {
    version: 1,
    plan: coercePlan(obj.plan),
    userState: obj.userState,
  };
}

/**
 * Lee el plan del hash de la URL si viene del bookmarklet: #plan=<gzip+base64>.
 * Devuelve null si no hay nada. Limpia el hash tras leerlo.
 *
 * Si el hash existe pero está incompleto o corrupto, informa el error al
 * llamador: caer silenciosamente al estado vacío hacía imposible entender por
 * qué un link recibido en el celular no mostraba el plan.
 */
export async function readPlanFromHash(): Promise<PlanImportBundle | null> {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const sharedMatch = hash.match(/[#&]share=([^&]+)/);
  const planMatch = hash.match(/[#&]plan=([^&]+)/);
  if (!sharedMatch && !planMatch) return null;
  try {
    const bundle = sharedMatch
      ? (() => {
          return decodeCompressedJson(sharedMatch[1]).then((data) => {
            const shared = coerceSharedPlanPayload(data);
            return { plan: shared.plan, userState: shared.userState };
          });
        })()
      : decodeCompressedPlan(planMatch![1]).then((plan) => ({ plan }));
    const result = await bundle;
    // Limpiar el hash para no re-importar en cada render / al compartir el link.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return result;
  } catch (e) {
    console.error('No se pudo decodificar el plan del link:', e);
    throw new Error(
      'No pude importar el plan de este link. Verificá que se haya copiado completo y volvé a probar.'
    );
  }
}
