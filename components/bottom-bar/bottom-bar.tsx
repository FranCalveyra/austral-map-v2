"use client";

import React from 'react';
import { Info, GraduationCap, HelpCircle, Layers } from 'lucide-react';
import { DeveloperInfo } from '../navigation/developer-info';

interface ProgressData {
  ingress: { approved: number; total: number };
  plan: { approved: number; total: number };
  electives: { hoursCompleted: number; hoursNeeded: number; subjectsCompleted: number; subjectsNeeded: number };
  averageGrade: number | null;
}

interface BottomBarProps {
  progress: ProgressData;
  showLegend: boolean;
  onToggleLegend: () => void;
  showElectives: boolean;
  onToggleElectives: () => void;
  showIngressCourse: boolean;
  onToggleIngressCourse: () => void;
  showProjectInfo: boolean;
  onToggleProjectInfo: () => void;
}

export function BottomBar({
  progress,
  showLegend,
  onToggleLegend,
  showElectives,
  onToggleElectives,
  showIngressCourse,
  onToggleIngressCourse,
  showProjectInfo,
  onToggleProjectInfo,
}: BottomBarProps) {

  const totalSubjects = progress.ingress.total + progress.plan.total;
  const approvedSubjects = progress.ingress.approved + progress.plan.approved;
  const progressPercentage = totalSubjects > 0 ? (approvedSubjects / totalSubjects) * 100 : 0;
  const electivePercentage = progress.electives.hoursNeeded > 0
    ? (progress.electives.hoursCompleted / progress.electives.hoursNeeded) * 100
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 shadow-lg z-40 bg-[#21262d]">
      <div className="flex flex-col md:flex-row flex-wrap justify-between p-4">
        {/* Buttons section */}
        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center space-y-2 md:space-y-0 md:space-x-2">
          {/* Legend toggle */}
          <button
            onClick={onToggleLegend}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors
              ${showLegend ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
          >
            <Info className="w-4 h-4 mr-2" />
            Información
          </button>

          {/* Electives toggle */}
          <button
            onClick={onToggleElectives}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors
              ${showElectives ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
          >
            <Layers className="w-4 h-4 mr-2" />
            Electivas
          </button>

          {/* Ingress Course toggle */}
          <button
            onClick={onToggleIngressCourse}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors
              ${showIngressCourse ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Curso de Ingreso
          </button>

          {/* Project Info toggle */}
          <button
            onClick={onToggleProjectInfo}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors
              ${showProjectInfo ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Acerca del Proyecto
          </button>
        </div>

        {/* Right side - Progress */}
        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-white">
              {progress.averageGrade && (
                <span className="ml-3 text-yellow-300">
                  • Promedio: {progress.averageGrade.toFixed(2)}
                </span>
              )}
              <span className="ml-3">
              Progreso Total: {approvedSubjects}/{totalSubjects}
              </span>
            </div>
            <div className="text-xs text-gray-300 flex space-x-4">
              <span>Curso de Ingreso: {progress.ingress.approved}/{progress.ingress.total}</span>
              <span>Plan: {progress.plan.approved}/{progress.plan.total}</span>
              <span>Electivas: {progress.electives.hoursCompleted}/{progress.electives.hoursNeeded} horas</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
                <div className="relative w-full md:w-32 bg-gray-200 rounded-full h-3 mb-1">
                  <div
                    className="absolute left-0 h-3 rounded-l-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                  {progress.electives.hoursNeeded > 0 && (
                    <div
                      className="absolute h-3 bg-cyan-500 rounded-r-full transition-all duration-500"
                      style={{
                        left: `${progressPercentage}%`,
                        width: `${electivePercentage}%`,
                      }}
                    />
                  )}
                </div>
            <div className="text-xs text-gray-300">
              {progressPercentage.toFixed(1)}% completado
            </div>
          </div>

          {/* Developer Info moved here */}
          <div className="flex items-center flex-shrink-0">
            <DeveloperInfo />
          </div>
        </div>
      </div>
    </div>
  );
} 