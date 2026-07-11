export interface Subject {
  Course: string;
  ID: string;
  Year: number | string;
  Semester: number | null;
  Credits: string | null;
  "Prerequisites to Take": string | null;
  "Prerequisites to Pass": string | null;
  "Prerequisite to Take for": string | null;
  "Prerequisite to Pass for": string | null;
}

export interface ParsedPrerequisite {
  id: string;
  condition: 'Regularizada' | 'Aprobada';
}

/**
 * Formato genérico que produce el harvester de SIU (scripts/siu-harvester.js).
 * Es la única fuente de verdad: sirve para cualquier plan/carrera.
 */
export interface HarvestedPrereq {
  id: string;
  condition: 'Regularizada' | 'Aprobada';
  option?: number;
}

export interface HarvestedSubject {
  course: string;
  id: string;
  type?: string;
  module: string;
  /** número de año (0 = ingreso), 'Electives' (optativas) o null (otros requisitos) */
  year: number | 'Electives' | null;
  credits: string | null;
  nota: string | null;
  origen: string | null;
  prerequisitesToTake: HarvestedPrereq[];
  prerequisitesToPass: HarvestedPrereq[];
  prerequisiteToTakeFor?: HarvestedPrereq[];
  prerequisiteToPassFor?: HarvestedPrereq[];
}

export interface HarvestedPlan {
  meta?: {
    source?: string;
    generatedAt?: string;
    /** alumno/persona inferida desde el encabezado de SIU */
    studentName?: string | null;
    /** carrera/propuesta inferida desde SIU */
    careerName?: string | null;
    /** plan de estudios que está cursando el alumno */
    planName?: string | null;
    propuesta?: string | null;
    encabezado?: string | null;
    /** horas de optativas requeridas ("Cumplimiento: Obtener N horas") */
    electiveHoursRequired?: number | null;
  };
  subjects: HarvestedSubject[];
}

export type SubjectStatus = 'DISPONIBLE' | 'NO_DISPONIBLE' | 'CURSANDO' | 'EN_FINAL' | 'DESAPROBADA' | 'APROBADA';

export interface UserNodeState {
  status?: SubjectStatus;
  grade?: number | null;
  x?: number;
  y?: number;
}

export interface SharedPlanPayload {
  version: 1;
  plan: HarvestedPlan;
  userState?: {
    version: 1;
    updatedAt?: string;
    nodes: Record<string, UserNodeState>;
  };
}

export interface SubjectNode extends Subject {
  x: number;
  y: number;
  width?: number;
  status: SubjectStatus;
  isHighlighted: boolean;
  isElective?: boolean;
  isAnnual?: boolean;
  prerequisites: ParsedPrerequisite[];
  prerequisiteFor: ParsedPrerequisite[];
  grade?: number | null;
}

export interface Connection {
  from: string;
  to: string;
  condition: 'Regularizada' | 'Aprobada';
  fromStatus: SubjectStatus;
}

export interface Position {
  x: number;
  y: number;
}
