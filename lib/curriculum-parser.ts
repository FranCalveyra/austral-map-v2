import {
  SubjectNode,
  Connection,
  SubjectStatus,
  ParsedPrerequisite,
  HarvestedPlan,
  HarvestedSubject,
} from '@/types/curriculum';

// ---------------------------------------------------------------------------
// Layout (dos columnas por año cuando podemos inferir cuatrimestres)
// ---------------------------------------------------------------------------
export const LAYOUT = {
  startX: 100,
  startY: 100,
  columnWidth: 460,
  semesterColumnWidth: 220,
  nodeHeight: 120,
  nodeWidth: 180,
  annualNodeWidth: 400,
  electiveColumnWidth: 205,
  electiveRowHeight: 82,
  slotsPerElectiveColumn: 8,
};

type ColumnKey = string; // 'ingreso' | 'y1'.. | 'otros' | 'electives'

export interface Column {
  key: ColumnKey;
  label: string;
  /** índice de columna (0-based) usado para calcular la x */
  index: number;
}

function nodeColumnKey(year: SubjectNode['Year']): ColumnKey {
  if (year === 0) return 'ingreso';
  if (year === 'Electives') return 'electives';
  if (year === 'Otros') return 'otros';
  if (typeof year === 'number') return `y${year}`;
  return 'otros';
}

function columnLabel(key: ColumnKey): string {
  if (key === 'ingreso') return 'Curso de Ingreso';
  if (key === 'electives') return 'Electivas';
  if (key === 'otros') return 'Otros Requisitos';
  const ord = ['', '1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo'];
  const n = Number(key.slice(1));
  return `${ord[n] ?? `${n}º`} Año`;
}

function columnRank(key: ColumnKey): number {
  if (key === 'ingreso') return -1;
  if (key === 'otros') return 1000;
  if (key === 'electives') return 1001;
  return Number(key.slice(1)); // y1 -> 1, y2 -> 2, ...
}

/**
 * Devuelve las columnas presentes en los nodos, ordenadas y con su índice.
 * Parser y grafo llaman a esta misma función → nunca se desincronizan.
 */
export function getColumns(nodes: SubjectNode[]): Column[] {
  const keys = Array.from(new Set(nodes.map((n) => nodeColumnKey(n.Year))));
  keys.sort((a, b) => columnRank(a) - columnRank(b));
  return keys.map((key, index) => ({ key, label: columnLabel(key), index }));
}

// ---------------------------------------------------------------------------
// Estado / nota a partir de la fila de SIU
// ---------------------------------------------------------------------------
export function gradeFromNota(nota: string | null): number | null {
  if (!nota) return null;
  const m = nota.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export function statusFromNotaOrigen(
  nota: string | null,
  origen: string | null
): { status: SubjectStatus | null; grade: number | null } {
  const n = (nota || '').toLowerCase();
  const o = (origen || '').toLowerCase();
  const grade = gradeFromNota(nota);

  if (o.includes('en curso') || n.includes('en curso')) return { status: 'CURSANDO', grade: null };
  if (n.includes('desaprob')) return { status: 'DESAPROBADA', grade: null };
  // Regla clave: origen "Regularidad" ⇒ la materia está EN FINAL (regularizada, sin final rendido),
  // aunque la nota diga "Aprobado". Cualquier otro origen con aprobación ⇒ APROBADA.
  if (o.includes('regular')) return { status: 'EN_FINAL', grade: null };
  if (n.includes('aprob') || n.includes('promocion') || o.includes('promocion') || grade != null) {
    return { status: 'APROBADA', grade };
  }
  if (o.includes('equivalencia')) return { status: 'APROBADA', grade: null };
  return { status: null, grade: null };
}

// ---------------------------------------------------------------------------
// Correlatividades → grafo
// ---------------------------------------------------------------------------
const toParsedPrereq = (p: { id: string; condition: string }): ParsedPrerequisite => ({
  id: p.id,
  condition: p.condition === 'Regularizada' ? 'Regularizada' : 'Aprobada',
});

export function calculateSubjectStatus(subject: SubjectNode, allNodes: SubjectNode[]): SubjectStatus {
  if (['CURSANDO', 'EN_FINAL', 'DESAPROBADA', 'APROBADA'].includes(subject.status)) {
    return subject.status;
  }
  return calculateAvailableStatus(subject, allNodes);
}

export function calculateAvailableStatus(subject: SubjectNode, allNodes: SubjectNode[]): SubjectStatus {
  const canTake = subject.prerequisites.every((prereq) => {
    const prereqNode = allNodes.find((n) => n.ID === prereq.id);
    // Si la correlativa no está en el plan (ej. ingreso no listado), la damos por cumplida.
    if (!prereqNode) return true;
    if (prereq.condition === 'Aprobada') return prereqNode.status === 'APROBADA';
    return ['CURSANDO', 'EN_FINAL', 'APROBADA'].includes(prereqNode.status);
  });
  return canTake ? 'DISPONIBLE' : 'NO_DISPONIBLE';
}

// ---------------------------------------------------------------------------
// Build: HarvestedPlan → SubjectNode[]
// ---------------------------------------------------------------------------
function harvestedYearToNodeYear(year: HarvestedSubject['year']): SubjectNode['Year'] {
  if (year === 'Electives') return 'Electives';
  if (year === null) return 'Otros';
  return year; // number
}

function subjectCredits(subject: HarvestedSubject): number {
  const credits = parseFloat((subject.credits || '0').replace(',', '.')) || 0;
  return credits;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function inferAnnualCreditThreshold(subjects: HarvestedSubject[]): number {
  const credits = subjects
    .filter((s) => typeof s.year === 'number' && s.year > 0)
    .map(subjectCredits)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);

  if (credits.length < 4) return Infinity;
  const q1 = percentile(credits, 0.25);
  const q3 = percentile(credits, 0.75);
  return q3 + 1.5 * (q3 - q1);
}

function isAnnualSubject(subject: HarvestedSubject, annualCreditThreshold: number): boolean {
  return subjectCredits(subject) > annualCreditThreshold;
}

export function buildCurriculum(plan: HarvestedPlan): SubjectNode[] {
  const subjects = plan.subjects || [];
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const annualCreditThreshold = inferAnnualCreditThreshold(subjects);

  const semesterById = new Map<string, number | null>();
  subjects.forEach((s) => {
    if (typeof s.year !== 'number' || s.year <= 0 || isAnnualSubject(s, annualCreditThreshold)) {
      semesterById.set(s.id, null);
      return;
    }

    const hasSameYearPrereq = s.prerequisitesToTake.some((p) => subjectById.get(p.id)?.year === s.year);
    semesterById.set(s.id, hasSameYearPrereq ? 2 : 1);
  });

  // 1. Reverse edges: para cada materia, qué materias la tienen como correlativa "para cursar".
  // Fuente primaria: prerequisitesToTake de cada materia.
  // Fuente complementaria: prerequisiteToTakeFor cuando el plan ya trae la relación inversa
  // (por ejemplo JSONs históricos). NO elegir una sola: reconciliamos ambas.
  const prereqForMap = new Map<string, ParsedPrerequisite[]>();
  const addPrereqFor = (fromId: string, target: ParsedPrerequisite) => {
    const list = prereqForMap.get(fromId) || [];
    const existing = list.find((p) => p.id === target.id);
    if (!existing) {
      list.push(target);
    } else if (existing.condition !== 'Regularizada' && target.condition === 'Regularizada') {
      existing.condition = 'Regularizada';
    }
    prereqForMap.set(fromId, list);
  };

  subjects.forEach((s) => {
    s.prerequisitesToTake.forEach((p) => {
      addPrereqFor(p.id, { id: s.id, condition: p.condition === 'Regularizada' ? 'Regularizada' : 'Aprobada' });
    });
    (s.prerequisiteToTakeFor || []).forEach((p) => {
      addPrereqFor(s.id, { id: p.id, condition: p.condition === 'Regularizada' ? 'Regularizada' : 'Aprobada' });
    });
  });

  // 2. Nodos base
  const nodes: (SubjectNode & { _explicit?: boolean })[] = subjects.map((s) => {
    const year = harvestedYearToNodeYear(s.year);
    const { status, grade } = statusFromNotaOrigen(s.nota, s.origen);
    const isAnnual = isAnnualSubject(s, annualCreditThreshold);
    return {
      Course: s.course,
      ID: s.id,
      Year: year,
      Semester: semesterById.get(s.id) ?? null,
      Credits: s.credits,
      'Prerequisites to Take': null,
      'Prerequisites to Pass': null,
      'Prerequisite to Take for': null,
      'Prerequisite to Pass for': null,
      x: 0,
      y: 0,
      width: isAnnual ? LAYOUT.annualNodeWidth : LAYOUT.nodeWidth,
      status: status ?? 'NO_DISPONIBLE',
      isHighlighted: false,
      isElective: year === 'Electives',
      isAnnual,
      prerequisites: s.prerequisitesToTake.map(toParsedPrereq),
      prerequisiteFor: prereqForMap.get(s.id) || [],
      grade,
      _explicit: status != null,
    };
  });

  // 3. Layout por columnas (una por año)
  layoutNodes(nodes);

  // 4. Estado disponible/no-disponible para los que no traen estado explícito
  nodes.forEach((node) => {
    if (!node._explicit) {
      node.status = calculateAvailableStatus(node, nodes);
    }
    delete node._explicit;
  });

  return nodes;
}

function layoutNodes(nodes: SubjectNode[]): void {
  const {
    startX,
    startY,
    columnWidth,
    semesterColumnWidth,
    nodeHeight,
    electiveColumnWidth,
    electiveRowHeight,
    slotsPerElectiveColumn,
  } = LAYOUT;
  const columns = getColumns(nodes);
  const indexByKey = new Map(columns.map((c) => [c.key, c.index]));
  const electivesBaseIndex = indexByKey.get('electives') ?? columns.length;

  const rowCounters = new Map<ColumnKey, number>();
  const semesterRowCounters = new Map<string, number>();
  const annualRowsByKey = new Map<ColumnKey, number>();
  let electiveCounter = 0;

  nodes.forEach((node) => {
    const key = nodeColumnKey(node.Year);
    if (typeof node.Year === 'number' && node.Year > 0 && node.isAnnual) {
      annualRowsByKey.set(key, (annualRowsByKey.get(key) ?? 0) + 1);
    }
  });

  nodes.forEach((node) => {
    const key = nodeColumnKey(node.Year);

    if (key === 'electives') {
      // Las optativas usan una grilla más compacta que los años.
      const colOffset = Math.floor(electiveCounter / slotsPerElectiveColumn);
      const rowOffset = electiveCounter % slotsPerElectiveColumn;
      node.x = startX + electivesBaseIndex * columnWidth + colOffset * electiveColumnWidth;
      node.y = startY + rowOffset * electiveRowHeight;
      electiveCounter += 1;
      return;
    }

    const colIndex = indexByKey.get(key) ?? 0;
    const semester = typeof node.Year === 'number' && node.Year > 0 && !node.isAnnual
      ? node.Semester ?? 1
      : null;
    const rowKey = semester ? `${key}-s${semester}` : key;
    const annualRows = semester ? annualRowsByKey.get(key) ?? 0 : 0;
    const row = annualRows + (semesterRowCounters.get(rowKey) ?? rowCounters.get(rowKey) ?? 0);
    node.x = startX + colIndex * columnWidth + (semester === 2 ? semesterColumnWidth : 0);
    node.y = startY + row * nodeHeight;
    if (semester) {
      semesterRowCounters.set(rowKey, row + 1);
    } else {
      rowCounters.set(rowKey, row + 1);
    }
  });
}

// ---------------------------------------------------------------------------
// Conexiones
// ---------------------------------------------------------------------------
export function getConnections(nodes: SubjectNode[]): Connection[] {
  const connections: Connection[] = [];
  for (const node of nodes) {
    for (const prereqFor of node.prerequisiteFor) {
      const targetNode = nodes.find((n) => n.ID === prereqFor.id);
      if (targetNode) {
        connections.push({
          from: node.ID,
          to: prereqFor.id,
          condition: prereqFor.condition,
          fromStatus: node.status,
        });
      }
    }
  }
  return connections;
}
