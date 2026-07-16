import {
  HarvestedPlan,
  HarvestedPrereq,
  SharedPlanPayload,
  Subject,
  SubjectNode,
  SubjectStatus,
  UserNodeState,
} from '@/types/curriculum';
import { buildCurriculum } from '@/lib/curriculum-parser';

const STATUS_CODES: SubjectStatus[] = [
  'DISPONIBLE',
  'NO_DISPONIBLE',
  'CURSANDO',
  'EN_FINAL',
  'DESAPROBADA',
  'APROBADA',
];

type CompactPrerequisite = [string, 0 | 1, number?];
type CompactSubject = [
  string,
  string,
  string | null,
  string,
  number | 'E' | null,
  string | null,
  string | null,
  string | null,
  CompactPrerequisite[],
  CompactPrerequisite[],
  CompactPrerequisite[]?,
  CompactPrerequisite[]?
];

type CompactSharedPlanPayload = {
  v: 2;
  m?: Array<string | number | null>;
  s: CompactSubject[];
  u?: Record<string, [number | null, number | null, number | null, number | null]>;
};

function compactPrerequisites(prerequisites: HarvestedPrereq[] | undefined): CompactPrerequisite[] {
  return (prerequisites ?? []).map((prerequisite) => [
    prerequisite.id,
    prerequisite.condition === 'Regularizada' ? 0 : 1,
    prerequisite.option,
  ]);
}

function expandPrerequisites(prerequisites: CompactPrerequisite[] | undefined): HarvestedPrereq[] {
  return (prerequisites ?? []).map(([id, condition, option]) => ({
    id,
    condition: condition === 0 ? 'Regularizada' : 'Aprobada',
    ...(typeof option === 'number' ? { option } : {}),
  }));
}

/**
 * Compacta el link compartido sin perder información: las claves repetidas se
 * reemplazan por posiciones y el estado default del mapa no viaja.
 */
export function createCompactSharedPlanPayload(
  plan: HarvestedPlan,
  nodes: SubjectNode[]
): CompactSharedPlanPayload {
  const defaultNodes = new Map(buildCurriculum(plan).map((node) => [node.ID, node]));
  const userChanges: CompactSharedPlanPayload['u'] = {};

  for (const node of nodes) {
    const initial = defaultNodes.get(node.ID);
    if (!initial) continue;

    const status = node.status === initial.status ? null : STATUS_CODES.indexOf(node.status);
    const grade = node.grade == null ? null : node.grade;
    const x = node.x === initial.x ? null : node.x;
    const y = node.y === initial.y ? null : node.y;
    if (status !== null || grade !== null || x !== null || y !== null) {
      userChanges[node.ID] = [status, grade, x, y];
    }
  }

  const meta = plan.meta;
  return {
    v: 2,
    ...(meta
      ? {
          m: [
            meta.source ?? null,
            meta.generatedAt ?? null,
            meta.studentName ?? null,
            meta.careerName ?? null,
            meta.planName ?? null,
            meta.propuesta ?? null,
            meta.encabezado ?? null,
            meta.electiveHoursRequired ?? null,
          ],
        }
      : {}),
    s: plan.subjects.map((subject) => [
      subject.course,
      subject.id,
      subject.type ?? null,
      subject.module,
      subject.year === 'Electives' ? 'E' : subject.year,
      subject.credits,
      subject.nota,
      subject.origen,
      compactPrerequisites(subject.prerequisitesToTake),
      compactPrerequisites(subject.prerequisitesToPass),
      compactPrerequisites(subject.prerequisiteToTakeFor),
      compactPrerequisites(subject.prerequisiteToPassFor),
    ]),
    ...(Object.keys(userChanges).length > 0 ? { u: userChanges } : {}),
  };
}

function expandCompactSharedPlanPayload(data: unknown): PlanImportBundle {
  const compact = data as Partial<CompactSharedPlanPayload>;
  if (compact.v !== 2 || !Array.isArray(compact.s)) {
    throw new Error('El link compartido no tiene la forma esperada.');
  }

  const meta = compact.m ?? [];
  const plan: HarvestedPlan = {
    ...(compact.m
      ? {
          meta: {
            source: typeof meta[0] === 'string' ? meta[0] : undefined,
            generatedAt: typeof meta[1] === 'string' ? meta[1] : undefined,
            studentName: typeof meta[2] === 'string' ? meta[2] : null,
            careerName: typeof meta[3] === 'string' ? meta[3] : null,
            planName: typeof meta[4] === 'string' ? meta[4] : null,
            propuesta: typeof meta[5] === 'string' ? meta[5] : null,
            encabezado: typeof meta[6] === 'string' ? meta[6] : null,
            electiveHoursRequired: typeof meta[7] === 'number' ? meta[7] : null,
          },
        }
      : {}),
    subjects: compact.s.map((subject) => {
      const [course, id, type, module, year, credits, nota, origen, take, pass, takeFor, passFor] = subject;
      if (typeof course !== 'string' || typeof id !== 'string' || typeof module !== 'string') {
        throw new Error('El link compartido contiene una materia inválida.');
      }
      return {
        course,
        id,
        ...(typeof type === 'string' ? { type } : {}),
        module,
        year: year === 'E' ? 'Electives' : year,
        credits: typeof credits === 'string' ? credits : null,
        nota: typeof nota === 'string' ? nota : null,
        origen: typeof origen === 'string' ? origen : null,
        prerequisitesToTake: expandPrerequisites(take),
        prerequisitesToPass: expandPrerequisites(pass),
        prerequisiteToTakeFor: expandPrerequisites(takeFor),
        prerequisiteToPassFor: expandPrerequisites(passFor),
      };
    }),
  };

  const nodes: Record<string, UserNodeState> = {};
  for (const [id, change] of Object.entries(compact.u ?? {})) {
    const [status, grade, x, y] = change;
    nodes[id] = {
      ...(typeof status === 'number' && STATUS_CODES[status] ? { status: STATUS_CODES[status] } : {}),
      ...(typeof grade === 'number' ? { grade } : {}),
      ...(typeof x === 'number' ? { x } : {}),
      ...(typeof y === 'number' ? { y } : {}),
    };
  }

  return {
    plan,
    ...(Object.keys(nodes).length > 0
      ? { userState: { version: 1, updatedAt: new Date().toISOString(), nodes } }
      : {}),
  };
}

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
            if ((data as { v?: unknown })?.v === 2) {
              return expandCompactSharedPlanPayload(data);
            }
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
