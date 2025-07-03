"use client";

import React from 'react';
import { SubjectNode, SubjectStatus } from '@/types/curriculum';
import { Logo } from './logo';
import { TitleSection } from './title-section';
import { UploadButton } from './upload-button';
import { SubjectInfo } from './subject-info';
import { DeveloperInfo } from './developer-info';

interface NavbarProps {
  selectedSubject: SubjectNode | null;
  nodes: SubjectNode[];
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
  onGradeChange: (subjectId: string, grade: number) => void;
  onFileUpload: (file: File) => void;
  studentName?: string;
}

export function Navbar({ selectedSubject, nodes, onStatusChange, onGradeChange, onFileUpload, studentName }: NavbarProps) {
  return (
    <nav className="w-full border-b border-gray-700 shadow-sm" style={{ backgroundColor: '#21262d' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left side - Logo, title and upload */}
          <div className="flex items-center space-x-4">
            <Logo />
            <TitleSection studentName={studentName} />
            <UploadButton onFileUpload={onFileUpload} />
          </div>

          {/* Center - Subject info and controls */}
          <div className="flex items-center space-x-6 flex-1 justify-center px-16 pr-24">
            <SubjectInfo 
              selectedSubject={selectedSubject}
              nodes={nodes}
              onStatusChange={onStatusChange}
              onGradeChange={onGradeChange}
            />
          </div>

          {/* Right side - Contact Info */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <DeveloperInfo />
          </div>
        </div>
      </div>
    </nav>
  );
}