"use client";

import React from 'react';
import { SubjectNode, SubjectStatus } from '@/types/curriculum';
import { BookOpen, Calendar, Play, FileText, X, Check, Upload, Github, Linkedin, Mail } from 'lucide-react';



interface NavbarProps {
  selectedSubject: SubjectNode | null;
  nodes: SubjectNode[];
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
  onGradeChange: (subjectId: string, grade: number) => void;
  onFileUpload: (file: File) => void;
  studentName?: string;
}

export function Navbar({ selectedSubject, nodes, onStatusChange, onGradeChange, onFileUpload, studentName }: NavbarProps) {

  const getStatusIcon = (status: SubjectStatus) => {
    switch (status) {
      case 'CURSANDO':
        return <Play className="h-4 w-4" />;
      case 'EN_FINAL':
        return <FileText className="h-4 w-4" />;
      case 'DESAPROBADA':
        return <X className="h-4 w-4" />;
      case 'APROBADA':
        return <Check className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: SubjectStatus) => {
    switch (status) {
      case 'CURSANDO':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'EN_FINAL':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'DESAPROBADA':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'APROBADA':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DISPONIBLE':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'NO_DISPONIBLE':
        return 'text-gray-400 bg-gray-100 border-gray-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: SubjectStatus) => {
    switch (status) {
      case 'CURSANDO':
        return 'Cursando';
      case 'EN_FINAL':
        return 'En Final';
      case 'DESAPROBADA':
        return 'Desaprobada';
      case 'APROBADA':
        return 'Aprobada';
      case 'DISPONIBLE':
        return 'Disponible';
      case 'NO_DISPONIBLE':
        return 'No Disponible';
      default:
        return status;
    }
  };

  const statusOptions: SubjectStatus[] = ['DISPONIBLE', 'CURSANDO', 'EN_FINAL', 'DESAPROBADA', 'APROBADA'];

  // Determine if prerequisites are met enough to allow marking as DISPONIBLE/CURSANDO
  const canModifyProgress = React.useMemo(() => {
    if (!selectedSubject) return false;
    return selectedSubject.prerequisites.every(pr => {
      const prereqNode = nodes.find(n => n.ID === pr.id);
      if (!prereqNode) return false;
      if (pr.condition === 'Aprobada') {
        return prereqNode.status === 'APROBADA';
      }
      // Regularizada requires at least EN_FINAL or APROBADA
      return ['EN_FINAL', 'APROBADA'].includes(prereqNode.status);
    });
  }, [selectedSubject, nodes]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };
  return (
    <nav className="w-full border-b border-gray-700 shadow-sm" style={{ backgroundColor: '#21262d' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left side - Logo, title and upload */}
                      <div className="flex items-center space-x-4">
              <img src="/assets/austral-logo.svg" alt="Universidad Austral" className="h-12 w-12 brightness-0 invert" />
              <div>
              <h1 className="text-xl font-bold text-white">
                Plan de Estudios
              </h1>
              <p className="text-sm text-gray-300">
                {studentName ? `Estudiante: ${studentName}` : 'Visualizador de Plan de Estudios'}
              </p>
            </div>

            {/* Upload button */}
            <div className="relative">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Subir plan de estudios</span>
              </label>
            </div>
          </div>

          {/* Center - Subject info and controls */}
                      <div className="flex items-center space-x-6 flex-1 justify-center px-16 pr-24">
            {selectedSubject ? (
              <div className="bg-blue-900 px-8 py-2 rounded-lg border border-blue-700 flex items-center justify-between flex-wrap">
                                  <div className="flex items-center space-x-4 min-w-max">
                    <BookOpen className="h-5 w-5 text-blue-300" />
                    <div>
                      <h3 className="font-semibold text-white">
                        {selectedSubject.Course}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-blue-200">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {selectedSubject.Year === 0 ? 'Curso de Ingreso' : `Año ${selectedSubject.Year}${selectedSubject.Semester ? `, Cuatrimestre ${selectedSubject.Semester}` : ' (ANUAL)'}`}
                      </span>
                      <span>ID: {selectedSubject.ID}</span>
                      <span>{selectedSubject.Credits} créditos</span>
                    </div>
                  </div>
                </div>

                {/* Status controls */}
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  <span className="text-sm font-medium text-white">Estado:</span>
                  <div className="flex space-x-1">
                    {statusOptions.map((status) => {
                      const isRestricted = (status === 'DISPONIBLE' || status === 'CURSANDO') && !canModifyProgress;
                      return (
                        <button
                          key={status}
                          onClick={() => !isRestricted && onStatusChange(selectedSubject.ID, status)}
                          disabled={isRestricted}
                                                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all duration-200
                            ${selectedSubject.status === status ? getStatusColor(status) : 'text-gray-300 bg-gray-800 border-gray-600 hover:bg-gray-700'}
                            ${isRestricted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(status)}
                            <span>{getStatusText(status)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Grade input when approved */}
                  {selectedSubject.status === 'APROBADA' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-sm font-medium text-white">Nota:</span>
                      <input
                        type="number"
                        min={4}
                        max={10}
                        step={1}
                        value={selectedSubject.grade ?? ''}
                        onChange={(e) => onGradeChange(selectedSubject.ID, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-600 bg-gray-800 text-white rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-300 text-sm">
                Selecciona una materia para ver detalles y cambiar estado
              </div>
            )}
          </div>

          {/* Right side - Contact Info */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-medium text-white">Desarrollado por FranCalveyra</div>
              <div className="flex items-center space-x-3 mt-1">
                <a
                  href="https://github.com/FranCalveyra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-gray-300 hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4 mr-1" />
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/francisco-calveyra/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-gray-300 hover:text-blue-400 transition-colors"
                >
                  <Linkedin className="w-4 h-4 mr-1" />
                  LinkedIn
                </a>
                <a
                  href="mailto:franciscocalveyra24@gmail.com"
                  className="flex items-center text-xs text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}