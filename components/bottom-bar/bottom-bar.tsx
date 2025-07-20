"use client";

import React from 'react';
import { Info, GraduationCap, HelpCircle, Layers } from 'lucide-react';
import { DeveloperInfo } from '../navigation/developer-info';

interface ProgressData {
  ingress: { approved: number; total: number };
  obligatorias: { approvedCredits: number; totalCredits: number };
  electives: { completedHours: number; neededHours: number };
  averageGrade: number | null;
  totalCareerCredits: number;
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

  // Calculate progress percentages for each segment
  const obligatoriasProgress = progress.obligatorias.totalCredits > 0 ? (progress.obligatorias.approvedCredits / progress.obligatorias.totalCredits) * 100 : 0;
  const electivasProgress = progress.electives.neededHours > 0 ? (progress.electives.completedHours / progress.electives.neededHours) * 100 : 0;

  // Calculate the proportional width of each segment in the total bar
  const electivasEquivalentCredits = progress.electives.neededHours * 5 / 32;
  const obligatoriasWidth = progress.totalCareerCredits > 0 ? (progress.obligatorias.totalCredits / progress.totalCareerCredits) * 100 : 0;
  const electivasWidth = progress.totalCareerCredits > 0 ? (electivasEquivalentCredits / progress.totalCareerCredits) * 100 : 0;

  // Calculate overall progress percentage
  const totalProgress = (obligatoriasProgress * obligatoriasWidth / 100) + (electivasProgress * electivasWidth / 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 shadow-lg z-40 bg-[#21262d] max-h-[20vh] overflow-y-auto">
      <div className="flex flex-col md:flex-row items-center justify-between p-4 w-full">

        {/* Buttons section */}
        <div className="w-full overflow-x-auto">
          <div className="flex flex-nowrap items-center space-x-2 py-2">
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
        </div>

        {/* Middle - Progress info */}
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="text-right">
            {/* Average and counts */}
            <div className="text-sm font-medium text-white">
              {progress.averageGrade && (
                <span className="ml-3 text-yellow-300">
                  • Promedio: {progress.averageGrade.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-300 flex space-x-4">
              <span>Obligatorias: {progress.obligatorias.approvedCredits.toFixed(0)}/{progress.obligatorias.totalCredits.toFixed(0)} cred.</span>
              <span>Electivas: {progress.electives.completedHours.toFixed(0)}/{progress.electives.neededHours} hs</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative w-full md:w-64 bg-gray-700 rounded-full h-4 overflow-hidden flex text-white text-xs items-center justify-center">
              {/* Obligatorias Segment */}
              <div style={{ width: `${obligatoriasWidth}%` }} className="bg-blue-300/50 h-full">
                <div style={{ width: `${obligatoriasProgress}%` }} className="bg-blue-500 h-full"></div>
              </div>
              {/* Electivas Segment */}
              <div style={{ width: `${electivasWidth}%` }} className="bg-purple-300/50 h-full">
                <div style={{ width: `${electivasProgress}%` }} className="bg-purple-500 h-full"></div>
              </div>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {totalProgress.toFixed(1)}% completado
            </div>
          </div>

        {/* Right - Developer info */}
        <div className="flex items-center flex-shrink-0">
          <DeveloperInfo />
        </div>

        </div>
      </div>
    </div>
  );
} 