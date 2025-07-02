"use client";

import React from 'react';
import { Info, Layers, GraduationCap, HelpCircle } from 'lucide-react';

interface ProgressData {
  ingress: { approved: number; total: number };
  plan: { approved: number; total: number };
  electives: { hoursCompleted: number; hoursNeeded: number; subjectsCompleted: number; subjectsNeeded: number };
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
  onToggleProjectInfo
}: BottomBarProps) {
  const totalSubjects = progress.ingress.total + progress.plan.total;
  const approvedSubjects = progress.ingress.approved + progress.plan.approved;
  const progressPercentage = totalSubjects > 0 ? (approvedSubjects / totalSubjects) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 shadow-lg z-40" style={{ backgroundColor: '#21262d' }}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Toggles */}
        <div className="flex items-center space-x-2">
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
        <div className="flex items-center space-x-4">
                      <div className="text-right">
              <div className="text-sm font-medium text-white">
                Progreso Total: {approvedSubjects}/{totalSubjects}
              </div>
              <div className="text-xs text-gray-300 flex space-x-4">
              <span>Curso Ingreso: {progress.ingress.approved}/{progress.ingress.total}</span>
              <span>Plan: {progress.plan.approved}/{progress.plan.total}</span>
              <span>Electivas: {progress.electives.subjectsCompleted}/{progress.electives.subjectsNeeded} materias</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-32 bg-gray-200 rounded-full h-3 mb-1">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-300">
              {progressPercentage.toFixed(1)}% completado
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 