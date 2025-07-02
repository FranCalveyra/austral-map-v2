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

export type SubjectStatus = 'DISPONIBLE' | 'NO_DISPONIBLE' | 'CURSANDO' | 'EN_FINAL' | 'DESAPROBADA' | 'APROBADA';

export interface SubjectNode extends Subject {
  x: number;
  y: number;
  status: SubjectStatus;
  isHighlighted: boolean;
  isElective?: boolean;
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