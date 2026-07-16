"use client";

import React, { useState, useEffect } from 'react';
import {
  SubjectNode,
  SubjectStatus,
  HarvestedPlan,
  SharedPlanPayload,
  UserNodeState,
} from '@/types/curriculum';
import { CurriculumGraph } from '@/components/curriculum/curriculum-graph';
import { Navbar } from '@/components/navigation/navbar';
import { BottomBar } from '@/components/bottom-bar/bottom-bar';
import { ProjectInfoModal } from '@/components/modals/project-info-modal';
import { calculateSubjectStatus, buildCurriculum } from '@/lib/curriculum-parser';
import { coercePlan, encodeCompressedJson, readPlanFromHash } from '@/lib/plan-import';

const PLAN_STORAGE_KEY = 'austral-map:plan';
const USER_STATE_STORAGE_KEY = 'austral-map:user-state';
const DEFAULT_ELECTIVE_HOURS = 384;

type PersistedPlanState = {
  version: 1;
  planKey: string;
  updatedAt: string;
  nodes: Record<string, UserNodeState>;
};

function buildPlanKey(plan: HarvestedPlan): string {
  return JSON.stringify({
    careerName: plan.meta?.careerName ?? plan.meta?.propuesta ?? null,
    planName: plan.meta?.planName ?? null,
    subjects: plan.subjects.map((subject) => ({
      id: subject.id,
      course: subject.course,
      year: subject.year,
      prerequisitesToTake: subject.prerequisitesToTake,
      prerequisitesToPass: subject.prerequisitesToPass,
    })),
  });
}

function isSubjectStatus(value: unknown): value is SubjectStatus {
  return (
    value === 'DISPONIBLE' ||
    value === 'NO_DISPONIBLE' ||
    value === 'CURSANDO' ||
    value === 'EN_FINAL' ||
    value === 'DESAPROBADA' ||
    value === 'APROBADA'
  );
}

function readPersistedPlanState(planKey: string): PersistedPlanState | null {
  try {
    const raw = localStorage.getItem(USER_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedPlanState>;
    if (parsed.version !== 1 || parsed.planKey !== planKey || !parsed.nodes) return null;
    return parsed as PersistedPlanState;
  } catch {
    return null;
  }
}

function applyPersistedPlanState(nodes: SubjectNode[], persisted: PersistedPlanState | null): SubjectNode[] {
  if (!persisted) return nodes;

  return nodes.map((node) => {
    const saved = persisted.nodes[node.ID];
    if (!saved) return node;

    return {
      ...node,
      status: isSubjectStatus(saved.status) ? saved.status : node.status,
      grade: typeof saved.grade === 'number' || saved.grade === null ? saved.grade : node.grade,
      x: typeof saved.x === 'number' && Number.isFinite(saved.x) ? saved.x : node.x,
      y: typeof saved.y === 'number' && Number.isFinite(saved.y) ? saved.y : node.y,
    };
  });
}

function buildPersistedNodeState(nodes: SubjectNode[]): Record<string, UserNodeState> {
  return Object.fromEntries(
    nodes.map((node) => [
      node.ID,
      {
        status: node.status,
        grade: node.grade ?? null,
        x: node.x,
        y: node.y,
      },
    ])
  );
}

function cleanMetaText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractLabeledMetaValue(texts: unknown[], labels: string[]): string | undefined {
  const labelPattern = labels.join('|');
  const stopPattern = 'alumno|estudiante|apellido\\s+y\\s+nombre|nombre|carrera|propuesta|plan(?:\\s+de\\s+estudios)?|legajo|estado|ubicaci[oó]n|documento';
  const chunks = texts
    .filter(Boolean)
    .flatMap((text) => String(text).split(/[\n|]+/))
    .map(cleanMetaText)
    .filter(Boolean);

  for (const chunk of chunks) {
    const match = chunk.match(new RegExp('(?:^|\\b)(?:' + labelPattern + ')\\s*:?\\s*(.+)$', 'i'));
    if (!match) continue;

    const value = cleanMetaText(
      match[1].split(new RegExp('\\s+(?:' + stopPattern + ')\\s*:', 'i'))[0]
    );
    if (value) return value;
  }

  return undefined;
}

function cleanStudentNameCandidate(value: unknown): string | undefined {
  const candidate = cleanMetaText(value)
    .replace(/cerrar\s+sesi[oó]n|mis\s+datos|perfil|configuraci[oó]n|salir|logout|usuario/ig, ' ')
    .replace(/[▾▼⏷]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!candidate || candidate.length > 80 || /\d/.test(candidate)) return undefined;
  if (
    /(ingenier[ií]a|licenciatura|abogac[ií]a|medicina|contador|profesorado|maestr[ií]a|doctorado|carrera|propuesta|plan(?:\s+de\s+estudios)?|siu|guaran[ií])/i.test(candidate)
  ) {
    return undefined;
  }
  return candidate;
}

export default function Home() {
  const [nodes, setNodes] = useState<SubjectNode[]>([]);
  const [currentPlan, setCurrentPlan] = useState<HarvestedPlan | null>(null);
  const [planMeta, setPlanMeta] = useState<HarvestedPlan['meta']>(undefined);
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fitRevision, setFitRevision] = useState(0);

  const [showLegend, setShowLegend] = useState(false);
  const [showElectives, setShowElectives] = useState(false);
  const [showOtros, setShowOtros] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(false);

  const loadPlan = React.useCallback((
    rawPlan: HarvestedPlan | unknown,
    importedUserState?: SharedPlanPayload['userState']
  ) => {
    try {
      const plan = coercePlan(rawPlan);
      const nextPlanKey = buildPlanKey(plan);
      const sharedState: PersistedPlanState | null = importedUserState
        ? {
            version: 1,
            planKey: nextPlanKey,
            updatedAt: importedUserState.updatedAt ?? new Date().toISOString(),
            nodes: importedUserState.nodes,
          }
        : null;
      const persistedState = sharedState ?? readPersistedPlanState(nextPlanKey);
      const built = applyPersistedPlanState(buildCurriculum(plan), persistedState);
      setNodes(built);
      setCurrentPlan(plan);
      setPlanMeta(plan.meta);
      setPlanKey(nextPlanKey);
      setSelectedSubject(null);
      setError(null);
      setFitRevision((revision) => revision + 1);
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el plan');
    }
  }, []);

  // Carga inicial: primero el hash (bookmarklet), después localStorage.
  useEffect(() => {
    (async () => {
      try {
        const fromHash = await readPlanFromHash();
        if (fromHash) {
          loadPlan(fromHash.plan, fromHash.userState);
        } else {
          const stored = localStorage.getItem(PLAN_STORAGE_KEY);
          if (stored) {
            try {
              loadPlan(JSON.parse(stored));
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No pude importar el plan compartido.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadPlan]);

  useEffect(() => {
    if (!planKey || nodes.length === 0) return;

    const persistedState: PersistedPlanState = {
      version: 1,
      planKey,
      updatedAt: new Date().toISOString(),
      nodes: buildPersistedNodeState(nodes),
    };

    try {
      localStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(persistedState));
    } catch {
      // Si localStorage está lleno o bloqueado, no rompemos la UI.
    }
  }, [nodes, planKey]);

  const metaTexts = [planMeta?.encabezado, planMeta?.propuesta];
  const careerName = planMeta?.careerName ?? planMeta?.propuesta ?? undefined;
  const planName =
    planMeta?.planName ??
    extractLabeledMetaValue(metaTexts, ['plan(?:\\s+de\\s+estudios)?']);
  const studentName =
    cleanStudentNameCandidate(planMeta?.studentName) ??
    cleanStudentNameCandidate(
      extractLabeledMetaValue(metaTexts, ['alumno', 'estudiante', 'apellido\\s+y\\s+nombre'])
    );

  const handleGradeChange = (subjectId: string, grade: number) => {
    setNodes(prev => prev.map(node => (node.ID === subjectId ? { ...node, grade } : node)));
    if (selectedSubject?.ID === subjectId) {
      setSelectedSubject(prev => (prev ? { ...prev, grade } : null));
    }
  };

  const handleSubjectSelect = (subject: SubjectNode | null) => setSelectedSubject(subject);

  const handleStatusChange = (subjectId: string, status: SubjectStatus) => {
    setNodes(prev => {
      const updated = prev.map(node => (node.ID === subjectId ? { ...node, status } : node));
      return updated.map(node =>
        node.ID === subjectId ? node : { ...node, status: calculateSubjectStatus(node, updated) }
      );
    });
    if (selectedSubject?.ID === subjectId) {
      setSelectedSubject(prev => (prev ? { ...prev, status } : null));
    }
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => (node.ID === id ? { ...node, x, y } : node)));
  };

  // --- Progreso ---
  const ingressNodes = nodes.filter(node => node.Year === 0);
  const planNodes = nodes.filter(node => typeof node.Year === 'number' && node.Year > 0 && !node.isElective);
  const electiveNodes = nodes.filter(node => node.isElective);
  const ingressApproved = ingressNodes.filter(node => node.status === 'APROBADA').length;
  const approvedPlanCredits = planNodes
    .filter(n => n.status === 'APROBADA')
    .reduce((sum, node) => sum + parseFloat(node.Credits || '0'), 0);
  const totalPlanCredits = planNodes.reduce((sum, node) => sum + parseFloat(node.Credits || '0'), 0);
  const electiveHoursNeeded = planMeta?.electiveHoursRequired ?? DEFAULT_ELECTIVE_HOURS;
  const completedElectiveHours = electiveNodes
    .filter(node => node.status === 'APROBADA')
    .reduce((sum, node) => sum + (parseFloat(node.Credits || '0') || 0) * 32 / 5, 0);
  const electivesEquivalentCredits = electiveHoursNeeded * 5 / 32;
  const totalCareerCredits = totalPlanCredits + electivesEquivalentCredits;
  const approvedSubjectsWithGrades = [...ingressNodes, ...planNodes].filter(
    node => node.status === 'APROBADA' && node.grade != null
  );
  const averageGrade = approvedSubjectsWithGrades.length > 0
    ? approvedSubjectsWithGrades.reduce((sum, node) => sum + (node.grade || 0), 0) / approvedSubjectsWithGrades.length
    : null;

  const hasPlan = nodes.length > 0;
  const createMobileShareLink = React.useCallback(async () => {
    if (!currentPlan || nodes.length === 0) {
      throw new Error('Primero importá un plan para poder compartirlo.');
    }

    const payload: SharedPlanPayload = {
      version: 1,
      plan: currentPlan,
      userState: {
        version: 1,
        updatedAt: new Date().toISOString(),
        nodes: buildPersistedNodeState(nodes),
      },
    };
    const encoded = await encodeCompressedJson(payload);
    const configuredOrigin = process.env.NEXT_PUBLIC_SHARE_ORIGIN?.replace(/\/$/, '');
    const shareOrigin = configuredOrigin || window.location.origin;
    return `${shareOrigin}${window.location.pathname}#share=${encoded}`;
  }, [currentPlan, nodes]);

  return (
    <div className="h-screen flex flex-col bg-[#21262d]">
      <Navbar
        selectedSubject={selectedSubject}
        nodes={nodes}
        onStatusChange={handleStatusChange}
        onGradeChange={handleGradeChange}
        onImport={loadPlan}
        onCreateMobileShareLink={hasPlan ? createMobileShareLink : undefined}
        careerName={careerName}
        planName={planName}
        studentName={studentName}
      />

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg font-medium">Procesando plan de estudios...</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-red-200 text-red-700 px-4 py-3 rounded relative mx-4 mt-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <span className="sr-only">Dismiss</span>×
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden pb-[calc(20vh+1rem)] lg:pb-16">
        {hasPlan ? (
          <CurriculumGraph
            nodes={nodes}
            selectedSubject={selectedSubject}
            showLegend={showLegend}
            showElectives={showElectives}
            showOtros={showOtros}
            fitRevision={fitRevision}
            onSubjectSelect={handleSubjectSelect}
            onDrag={handleNodeDrag}
            onStatusChange={handleStatusChange}
          />
        ) : (
          !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 text-gray-300">
              <h2 className="text-2xl font-semibold text-white mb-2">Cargá tu plan de estudios</h2>
              <p className="max-w-md text-sm">
                Usá <span className="text-blue-400 font-medium">Importar mi plan</span> arriba a la
                izquierda para traer tu plan desde SIU Guaraní con un click, correlativas incluidas.
              </p>
            </div>
          )
        )}
      </main>

      <BottomBar
        progress={{
          ingress: { approved: ingressApproved, total: ingressNodes.length },
          obligatorias: { approvedCredits: approvedPlanCredits, totalCredits: totalPlanCredits },
          electives: { completedHours: completedElectiveHours, neededHours: electiveHoursNeeded },
          averageGrade: averageGrade,
          totalCareerCredits: totalCareerCredits,
        }}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(prev => !prev)}
        showElectives={showElectives}
        onToggleElectives={() => setShowElectives(prev => !prev)}
        showOtros={showOtros}
        onToggleOtros={() => setShowOtros(prev => !prev)}
        showProjectInfo={showProjectInfo}
        onToggleProjectInfo={() => setShowProjectInfo(prev => !prev)}
      />
      <ProjectInfoModal isOpen={showProjectInfo} onClose={() => setShowProjectInfo(false)} />
    </div>
  );
}
