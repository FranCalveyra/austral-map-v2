"use client";

import React, { useState, useEffect } from 'react';
import { CurriculumSchema } from '@/lib/models/curriculum';
import planCiencia from '@/docs/planes_json/Plan_Ciencia_de_Datos_2025.json';
import planIndustrial from '@/docs/planes_json/Plan_Ing_Industrial_2025.json';
import planInformatico from '@/docs/planes_json/Plan_Ing_Informática_2023.json';
import { SubjectNode, SubjectStatus } from '@/types/curriculum';
import { CurriculumGraph } from '@/components/curriculum/curriculum-graph';
import { Navbar } from '@/components/navigation/navbar';
import { BottomBar } from '@/components/bottom-bar/bottom-bar';
import { ProjectInfoModal } from '@/components/modals/project-info-modal';
import { calculateSubjectStatus, calculateLayout } from '@/lib/curriculum-parser';

// Array de planes disponibles
const PLANS = [
  { name: 'Licenciatura en Ciencia de Datos', curriculum: planCiencia, electiveHoursRequired: 192 },
  { name: 'Ingeniería Industrial', curriculum: planIndustrial, electiveHoursRequired: 256 },
  { name: 'Ingeniería Informática', curriculum: planInformatico, electiveHoursRequired: 384 },
];

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[2]);
  const [allPlanNodes, setAllPlanNodes] = useState<{ [key: string]: SubjectNode[] }>({});
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading to ensure the UI updates before calculating layout
    setTimeout(() => {
      if (!allPlanNodes[selectedPlan.name]) {
        const newCurr = CurriculumSchema.parse(selectedPlan.curriculum as any);
        const newNodes = calculateLayout(newCurr);
        setAllPlanNodes(prev => ({ ...prev, [selectedPlan.name]: newNodes }));
      }
      setIsLoading(false);
    }, 50); // A small delay
  }, [selectedPlan]);

  const nodes = allPlanNodes[selectedPlan.name] || [];

  const handlePlanSelect = (planName: string) => {
    const plan = PLANS.find(p => p.name === planName);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedSubject(null);
    }
  };

  const [selectedSubject, setSelectedSubject] = useState<SubjectNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | undefined>(undefined);

  const updateNodesForCurrentPlan = (newNodes: SubjectNode[]) => {
    setAllPlanNodes(prev => ({ ...prev, [selectedPlan.name]: newNodes }));
  };

  const handleGradeChange = (subjectId: string, grade: number) => {
    const newNodes = nodes.map(node => node.ID === subjectId ? { ...node, grade } : node);
    updateNodesForCurrentPlan(newNodes);
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
    const updated = nodes.map(node => node.ID === subjectId ? { ...node, status } : node);
    const newNodes = updated.map(node =>
      node.ID === subjectId
        ? node
        : { ...node, status: calculateSubjectStatus(node, updated) }
    );
    updateNodesForCurrentPlan(newNodes);

    if (selectedSubject?.ID === subjectId) {
      setSelectedSubject(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    const newNodes = nodes.map(node => node.ID === id ? { ...node, x, y } : node);
    updateNodesForCurrentPlan(newNodes);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('planName', selectedPlan.name);
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
        const newNodes = calculateLayout(newCurriculum);
        updateNodesForCurrentPlan(newNodes);
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

  const ingressNodes = nodes.filter(node => node.Year === 0);
  const planNodes = nodes.filter(node => typeof node.Year === 'number' && node.Year > 0 && !node.isElective);
  const electiveNodes = nodes.filter(node => node.isElective);
  const ingressApproved = ingressNodes.filter(node => node.status === 'APROBADA').length;
  const approvedPlanCredits = planNodes
    .filter(n => n.status === 'APROBADA')
    .reduce((sum, node) => sum + (parseFloat(node.Credits || '0')), 0);
  const totalPlanCredits = planNodes
    .reduce((sum, node) => sum + (parseFloat(node.Credits || '0')), 0);
  const electiveHoursNeeded = selectedPlan.electiveHoursRequired;
  const completedElectiveHours = electiveNodes
    .filter(node => node.status === 'APROBADA')
    .reduce((sum, node) => {
      const credits = parseFloat(node.Credits as string) || 0;
      return sum + (credits * 32 / 5);
    }, 0);
  const electivesEquivalentCredits = electiveHoursNeeded * 5 / 32;
  const totalCareerCredits = totalPlanCredits + electivesEquivalentCredits;
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
        planOptions={PLANS.map(p => p.name)}
        selectedPlanName={selectedPlan.name}
        onPlanSelect={handlePlanSelect}
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
        <div className="bg-red-50 border-red-200 text-red-700 px-4 py-3 rounded relative mx-4 mt-4">
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
        showIngressCourse={showIngressCourse}
        onToggleIngressCourse={() => setShowIngressCourse(prev => !prev)}
        showProjectInfo={showProjectInfo}
        onToggleProjectInfo={() => setShowProjectInfo(prev => !prev)}
      />
      <ProjectInfoModal
        isOpen={showProjectInfo}
        onClose={() => setShowProjectInfo(false)}
      />
    </div>
  );
}