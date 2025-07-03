"use client";

import React from 'react';
import { SubjectNode, SubjectStatus } from '@/types/curriculum';
import { cn } from '@/lib/utils';
import { NODE_WIDTH_CLASS, NODE_HEIGHT_CLASS } from '../constants';

interface SubjectNodeProps {
  subject: SubjectNode;
  onDrag: (id: string, x: number, y: number) => void;
  onClick: (subject: SubjectNode) => void;
  onDoubleClick: (subject: SubjectNode) => void;
  isDimmed: boolean;
  isSelected: boolean;
}

export function SubjectNodeComponent({
  subject,
  onDrag,
  onClick,
  onDoubleClick,
  isDimmed,
  isSelected
}: SubjectNodeProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - subject.x,
      y: e.clientY - subject.y
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Only allow vertical movement - keep x position fixed
    const newY = e.clientY - dragStart.y;
    onDrag(subject.ID, subject.x, newY);
  }, [isDragging, dragStart, onDrag, subject.ID, subject.x]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getNodeColor = () => {
    if (isSelected) return 'bg-blue-500 border-blue-600 text-white';
    
    switch (subject.status) {
      case 'APROBADA':
        return 'bg-green-500 border-green-600 text-white';
      case 'CURSANDO':
        return 'bg-blue-400 border-blue-500 text-white';
      case 'EN_FINAL':
        return 'bg-yellow-500 border-yellow-600 text-white';
      case 'DESAPROBADA':
        return 'bg-gray-700 border-gray-500 text-gray-100';
      case 'DISPONIBLE':
        return 'bg-gray-700 border-gray-500 text-gray-100 hover:border-blue-400';
      case 'NO_DISPONIBLE':
        return 'bg-gray-800 border-gray-600 text-gray-400';
      default:
        return 'bg-gray-700 border-gray-500 text-gray-100';
    }
  };

  const getOpacity = () => {
    if (isDimmed) return 'opacity-30';
    return 'opacity-100';
  };

  const getStatusIcon = () => {
    switch (subject.status) {
      case 'APROBADA':
        return '✓';
      case 'CURSANDO':
        return '📚';
      case 'EN_FINAL':
        return '📝';
      case 'DESAPROBADA':
        return '✗';
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (subject.status) {
      case 'APROBADA':
        return 'bg-green-600';
      case 'CURSANDO':
        return 'bg-blue-600';
      case 'EN_FINAL':
        return 'bg-yellow-600';
      case 'DESAPROBADA':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const statusIcon = getStatusIcon();
  
  // Use extended width for annual subjects (Semester is null)
  const isAnnual = subject.Semester === null;
  const widthClass = isAnnual ? 'w-[430px]' : NODE_WIDTH_CLASS; // 430px spans across two semesters (180px + 250px column gap)

  return (
    <div
      className={cn(
        'absolute select-none cursor-move rounded-2xl border-2 p-3 transition-all duration-200 flex flex-col items-center justify-center',
        widthClass,
        NODE_HEIGHT_CLASS,
        getNodeColor(),
        getOpacity(),
        isDragging && 'scale-105 z-50 cursor-ns-resize',
        isAnnual && 'border-4 border-dashed' // Visual indicator for annual subjects
      )}
      style={{
        left: subject.x,
        top: subject.y,
        transform: isDragging ? 'rotate(1deg)' : 'rotate(0deg)',
        zIndex: isDragging ? 50 : 10
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(subject); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(subject); }}
    >
      <div className="text-sm font-semibold leading-tight text-center">
        {subject.Course}
        {isAnnual && <span className="ml-2 text-xs opacity-75">(ANUAL)</span>}
      </div>
      {subject.status === 'APROBADA' && subject.grade != null && (
        <div className="text-sm mt-1 font-bold">
          [{subject.grade}]
        </div>
      )}
      {subject.status === 'EN_FINAL' && (
        <div className="text-xs mt-1 font-medium opacity-90">
          [EN FINAL]
        </div>
      )}
      {subject.status === 'CURSANDO' && (
        <div className="text-xs mt-1 font-medium opacity-90">
          [EN CURSO]
        </div>
      )}
    </div>
  );
}