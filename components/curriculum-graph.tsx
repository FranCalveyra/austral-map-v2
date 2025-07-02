"use client";

import React, { useCallback } from 'react';
import { SubjectNode, Connection, SubjectStatus } from '@/types/curriculum';
import { getConnections } from '@/lib/curriculum-parser';
import { SubjectNodeComponent } from './subject-node';
import { Connections } from './connections';
import { NODE_WIDTH_CLASS, NODE_HEIGHT_CLASS } from './constants';


interface CurriculumGraphProps {
  nodes: SubjectNode[];
  selectedSubject: SubjectNode | null;
  showLegend: boolean;
  showElectives: boolean;
  showIngressCourse: boolean;
  onSubjectSelect: (subject: SubjectNode | null) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
}

export function CurriculumGraph({ nodes, selectedSubject, showLegend, showElectives, showIngressCourse, onSubjectSelect, onDrag, onStatusChange }: CurriculumGraphProps) {
  // Same layout constants as in parser
  const startX = 100;
  const columnWidth = 250;
  
  // Zoom and pan state
  const [zoom, setZoom] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPoint, setLastPanPoint] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter nodes based on display settings
  const coreNodes = React.useMemo(() => {
    const filtered = nodes.filter(node => {
      // Always exclude electives from main graph
      if (node.isElective) return false;
      
      // Filter ingress course (Year 0) based on toggle
      if (!showIngressCourse && node.Year === 0) return false;
      
      return true;
    });
    return filtered;
  }, [nodes, showIngressCourse]);
  
  const connections = React.useMemo(() => {
    return getConnections(coreNodes);
  }, [coreNodes]);

  // Background click clears selection
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!isPanning) {
      onSubjectSelect(null);
    }
  }, [onSubjectSelect, isPanning]);

  // Handle wheel event for zooming (only when no subject is selected)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!selectedSubject) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newZoom = Math.min(Math.max(0.5, zoom + delta), 3);
      setZoom(newZoom);
    }
  }, [zoom, selectedSubject]);

  // Handle mouse events for panning (only when no subject is selected)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !selectedSubject) { // Left mouse button and no subject selected
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [selectedSubject]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);



  // Set up global mouse event listeners
  React.useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // User clicked a node
  const handleSubjectClick = useCallback((subject: SubjectNode) => {
    onSubjectSelect(subject);
  }, [onSubjectSelect]);

  // Double click toggles approved status
  const handleSubjectDoubleClick = useCallback((subject: SubjectNode) => {
    onStatusChange(subject.ID, subject.status === 'APROBADA' ? 'DISPONIBLE' : 'APROBADA');
  }, [onStatusChange]);

  // Determine which nodes to dim: non-selected and non-connected
  const connectedIds = React.useMemo(() => {
    const set = new Set<string>();
    if (selectedSubject) {
      set.add(selectedSubject.ID);
      connections.forEach(conn => {
        if (conn.from === selectedSubject.ID) set.add(conn.to);
        if (conn.to === selectedSubject.ID) set.add(conn.from);
      });
    }
    return set;
  }, [selectedSubject, connections]);

  // Get unique semesters for column headers based on core nodes (exclude annual subjects)
  const semesters = Array.from(new Set(
    coreNodes
      .filter(node => node.Semester !== null) // Exclude annual subjects
      .map(node => `${node.Year}-${node.Semester}`)
  ))
    .sort((a, b) => {
      const [yearA, semA] = a.split('-').map(Number);
      const [yearB, semB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return semA - semB;
    });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#21262d', cursor: isPanning ? 'grabbing' : (selectedSubject ? 'default' : 'grab') }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleBackgroundClick}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Column headers positioned above each cuatrimestre */}
      <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none">
        {/* Ingress course header */}
        {showIngressCourse && (
          <div className="absolute" style={{ left: startX + (columnWidth - 180) / 2, width: 180 }}>
            <div className={`bg-orange-50 rounded-lg shadow-md border border-orange-200 p-3 ${NODE_WIDTH_CLASS} ${NODE_HEIGHT_CLASS} flex items-center justify-center`}>
              <div className="font-semibold text-orange-800 text-center">
                Curso de Ingreso
              </div>
            </div>
          </div>
        )}
        
        {/* Regular semester headers */}
        {semesters.map((semester) => {
          const [year, sem] = semester.split('-').map(Number);
          // Skip Year 0 (ingress course) as it's handled separately
          if (year === 0) return null;
          
          // Compute cuatrimestre label
          const ordinals = ['', '1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo'];
          const cuatriIndex = (year - 1) * 2 + sem;
          const cuatriLabel = `${ordinals[cuatriIndex]} Cuatrimestre`;
          // Match the x offset from calculateLayout (add 1 column for ingress course)
          const columnIndex = 1 + (year - 1) * 2 + (sem - 1);
          const x = startX + columnIndex * columnWidth;
          return (
            <div
              key={semester}
              className="absolute"
              style={{ left: x }}
            >
                          <div className={`rounded-lg shadow-md border border-gray-600 p-3 ${NODE_WIDTH_CLASS} ${NODE_HEIGHT_CLASS} flex items-center justify-center`} style={{ backgroundColor: '#21262d' }}>
              <div className="font-semibold text-white">
                  {cuatriLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Connections */}
      <Connections nodes={coreNodes} connections={connections} selectedSubject={selectedSubject} />
      
      {/* Subject nodes */}
      {coreNodes.map(subject => {
        const isDimmed = selectedSubject ? !connectedIds.has(subject.ID) : false;
        const isSelected = selectedSubject?.ID === subject.ID;
        return (
          <SubjectNodeComponent
            key={subject.ID}
            subject={subject}
            onDrag={onDrag}
            onClick={handleSubjectClick}
            onDoubleClick={handleSubjectDoubleClick}
            isDimmed={isDimmed}
            isSelected={isSelected}
          />
        );
      })}
      
      </div>
      
      {/* Zoom Indicator */}
      <div className="fixed bottom-24 right-4 z-50">
        <div className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      
      {/* Legend - Fixed position */}
      {showLegend && (
        <div className="fixed bottom-20 left-4 p-4 rounded-lg shadow-lg border border-gray-600 z-40 max-w-sm" style={{ backgroundColor: '#21262d' }}>
          <h3 className="font-semibold text-sm mb-3 text-white">Leyenda</h3>
          
          {/* Connection Colors */}
          <div className="space-y-2 text-xs mb-4">
            <h4 className="font-medium text-gray-300 mb-2">Estados de Correlatividades:</h4>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-green-500 relative">
                <div className="absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-green-500 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
              </div>
                             <span className="text-gray-300">Materia Aprobada</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-1 bg-blue-500 relative">
                 <div className="absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-blue-500 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
               </div>
               <span className="text-gray-300">Materia Cursando</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-1 bg-yellow-500 relative">
                 <div className="absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-yellow-500 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
               </div>
               <span className="text-gray-300">Materia En Final</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-1 bg-red-500 relative">
                 <div className="absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-red-500 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
               </div>
               <span className="text-gray-300">Materia Desaprobada</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-6 h-1 bg-gray-400 relative">
                 <div className="absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-gray-400 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
               </div>
               <span className="text-gray-300">Sin Estado/Disponible</span>
            </div>
          </div>

          {/* Subject Colors */}
                     <div className="space-y-2 text-xs mb-4">
             <h4 className="font-medium text-gray-300 mb-2">Estados de Materias:</h4>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                             <span className="text-gray-300">Aprobada</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
               <span className="text-gray-300">Cursando</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
               <span className="text-gray-300">En Final</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
               <span className="text-gray-300">Desaprobada</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-gray-700 border border-gray-500 rounded"></div>
               <span className="text-gray-300">Disponible</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-gray-800 border border-gray-600 rounded"></div>
               <span className="text-gray-300">No Disponible</span>
            </div>
          </div>

          {/* Instructions */}
                     <div className="pt-2 border-t border-gray-600 text-xs text-gray-300">
            <p>• <strong>Click:</strong> seleccionar materia</p>
            <p>• <strong>Doble click:</strong> aprobar/desaprobar</p>
            <p>• <strong>Arrastrar materia:</strong> mover verticalmente</p>
            <p>• <strong>Rueda/trackpad:</strong> zoom (sin materia seleccionada)</p>
            <p>• <strong>Arrastrar fondo:</strong> desplazar vista (sin materia seleccionada)</p>
          </div>
        </div>
      )}
    </div>
  );
}