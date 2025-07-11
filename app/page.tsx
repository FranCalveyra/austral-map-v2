"use client";

import React, { useState, useEffect } from 'react';
import { CurriculumSchema } from '@/lib/models/curriculum';
import planCiencia from '@/docs/planes_json/Plan_Ciencia_de_Datos_2025.json';
import planIndustrial from '@/docs/planes_json/Plan_Ing_Industrial_2025.json';
import planInformatico from '@/docs/planes_json/Plan_Ing_Informática_2023.json';
import { Subject, SubjectNode, SubjectStatus } from '@/types/curriculum';
import { CurriculumGraph } from '@/components/curriculum/curriculum-graph';
import { Navbar } from '@/components/navigation/navbar';
import { BottomBar } from '@/components/bottom-bar/bottom-bar';
import { ProjectInfoModal } from '@/components/modals/project-info-modal';
import { calculateSubjectStatus, calculateLayout } from '@/lib/curriculum-parser';

// Array de planes disponibles
const PLANS = [
  { name: 'Licenciatura en Ciencia de Datos', curriculum: planCiencia },
  { name: 'Ingeniería Industrial', curriculum: planIndustrial },
  { name: 'Ingeniería Informática', curriculum: planInformatico },
];

export default function Home() {
  // Plan seleccionado (por defecto Ing Industrial)
  const [selectedPlan, setSelectedPlan] = useState(PLANS[2]);
  // Courses base a partir del plan seleccionado
  const [curriculum, setCurriculum] = useState<Subject[]>(() => CurriculumSchema.parse(selectedPlan.curriculum));
  const [nodes, setNodes] = useState<SubjectNode[]>(() => calculateLayout(curriculum));
  // Al cambiar el plan, recalcular curriculum y nodos
  useEffect(() => {
    const newCurr = CurriculumSchema.parse(selectedPlan.curriculum as any);
    setCurriculum(newCurr);
    setNodes(calculateLayout(newCurr));
    setSelectedSubject(null);
  }, [selectedPlan]);

  const initialStudentName = undefined;

  const [selectedSubject, setSelectedSubject] = useState<SubjectNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | undefined>(initialStudentName);

  const handleGradeChange = (subjectId: string, grade: number) => {
    setNodes(prev => prev.map(node => node.ID === subjectId ? { ...node, grade } : node));
    if (selectedSubject?.ID === subjectId) {
      setSelectedSubject(prev => prev ? { ...prev, grade } : null);
    }
  };
  const [showLegend, setShowLegend] = useState(false);
  const [showElectives, setShowElectives] = useState(false);
  const [showIngressCourse, setShowIngressCourse] = useState(true);
  const [showProjectInfo, setShowProjectInfo] = useState(false);

  const handleSubjectSelect = (subject: SubjectNode | null) => {
    setSelectedSubject(subject);
  };

  const handleStatusChange = (subjectId: string, status: SubjectStatus) => {
    setNodes(prev => {
      const updated = prev.map(node => node.ID === subjectId ? { ...node, status } : node);
      return updated.map(node =>
        node.ID === subjectId
          ? node
          : { ...node, status: calculateSubjectStatus(node, updated) }
      );
    });

    if (selectedSubject?.ID === subjectId) {
      setSelectedSubject(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => node.ID === id ? { ...node, x, y } : node));
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-plan', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process file');
      }

      if (result.success && result.data) {
        const newCurriculum = CurriculumSchema.parse(result.data);
        setCurriculum(newCurriculum);
        const newNodes = calculateLayout(newCurriculum);
        setNodes(newNodes);
        setSelectedSubject(null);
        if (result.studentName) {
          setStudentName(result.studentName);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate different types of progress
  const ingressNodes = nodes.filter(node => node.Year === 0);
  const planNodes = nodes.filter(node => typeof node.Year === 'number' && node.Year > 0 && !node.isElective);
  const electiveNodes = nodes.filter(node => node.isElective);

  const ingressApproved = ingressNodes.filter(node => node.status === 'APROBADA').length;
  const planApproved = planNodes.filter(node => node.status === 'APROBADA').length;
  const electiveApproved = electiveNodes.filter(node => node.status === 'APROBADA').length;

  // Calculate elective hours (5 credits = 32 hours, need 384 hours total)
  const electiveSubjectsNeeded = 384 / 32; // 384 hours / 32 hours per subject = 12 subjects
  const electiveHoursCompleted = electiveApproved * 32; // Each elective subject = 32 hours

  const approvedCount = planApproved + ingressApproved;

  // Calculate average grade from approved subjects with grades
  const approvedSubjectsWithGrades = [...ingressNodes, ...planNodes]
    .filter(node => node.status === 'APROBADA' && node.grade != null);
  const averageGrade = approvedSubjectsWithGrades.length > 0
    ? approvedSubjectsWithGrades.reduce((sum, node) => sum + (node.grade || 0), 0) / approvedSubjectsWithGrades.length
    : null;

  return (
    <div className="h-screen flex flex-col bg-[#21262d]">
      <Navbar
        selectedSubject={selectedSubject}
        nodes={nodes}
        onStatusChange={handleStatusChange}
        onGradeChange={handleGradeChange}
        onFileUpload={handleFileUpload}
        studentName={studentName}
      />

      {/* Loading overlay */}
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

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mx-4 mt-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        </div>
      )}

      <main className="flex-1 overflow-auto pb-16">
        <CurriculumGraph
          nodes={nodes}
          selectedSubject={selectedSubject}
          showLegend={showLegend}
          showElectives={showElectives}
          showIngressCourse={showIngressCourse}
          onSubjectSelect={handleSubjectSelect}
          onDrag={handleNodeDrag}
          onStatusChange={handleStatusChange}
        />
      </main>

      {showElectives && (
        <section className="p-4 bg-white mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Electivas ({electiveApproved}/{electiveSubjectsNeeded} materias - {electiveHoursCompleted}/384 horas completadas)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {electiveNodes.map(electiveNode => (
              <div
                key={electiveNode.ID}
                className={`border rounded-lg p-4 shadow-sm cursor-pointer transition-all
                  ${electiveNode.status === 'APROBADA' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                onClick={() => handleStatusChange(electiveNode.ID, electiveNode.status === 'APROBADA' ? 'DISPONIBLE' : 'APROBADA')}
              >
                <div className="font-semibold text-gray-800">{electiveNode.Course}</div>
                <div className="text-sm text-gray-600">ID: {electiveNode.ID}</div>
                <div className="text-xs mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${electiveNode.status === 'APROBADA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {electiveNode.status === 'APROBADA' ? '✓ Aprobada' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">5 créditos (32 horas)</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Bar */}
      <BottomBar
        progress={{
          ingress: { approved: ingressApproved, total: ingressNodes.length },
          plan: { approved: planApproved, total: planNodes.length },
          electives: { hoursCompleted: electiveHoursCompleted, hoursNeeded: 384, subjectsCompleted: electiveApproved, subjectsNeeded: electiveSubjectsNeeded },
          averageGrade: averageGrade
        }}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(prev => !prev)}
        showElectives={showElectives}
        onToggleElectives={() => setShowElectives(prev => !prev)}
        showIngressCourse={showIngressCourse}
        onToggleIngressCourse={() => setShowIngressCourse(prev => !prev)}
        showProjectInfo={showProjectInfo}
        onToggleProjectInfo={() => setShowProjectInfo(prev => !prev)}
        planOptions={PLANS.map(p => p.name)}
        selectedPlanName={selectedPlan.name}
        onPlanSelect={planName => {
          const plan = PLANS.find(p => p.name === planName);
          if (plan) setSelectedPlan(plan);
        }}
      />

      {/* Project Info Modal */}
      <ProjectInfoModal
        isOpen={showProjectInfo}
        onClose={() => setShowProjectInfo(false)}
      />
    </div>
  );
}