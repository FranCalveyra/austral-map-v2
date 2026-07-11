"use client";

import React from 'react';
import { SubjectNode, SubjectStatus, HarvestedPlan } from '@/types/curriculum';
import { Logo } from './logo';
import { TitleSection } from './title-section';
import { ImportPlanButton } from './import-plan-button';
import { ShareMobileButton } from './share-mobile-button';
import { SubjectInfo } from './subject-info';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  selectedSubject: SubjectNode | null;
  nodes: SubjectNode[];
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
  onGradeChange: (subjectId: string, grade: number) => void;
  onImport: (plan: HarvestedPlan) => void;
  onCreateMobileShareLink?: () => Promise<string>;
  careerName?: string;
  planName?: string;
  studentName?: string;
}

export function Navbar({
  selectedSubject,
  nodes,
  onStatusChange,
  onGradeChange,
  onImport,
  onCreateMobileShareLink,
  careerName,
  planName,
  studentName,
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#21262d]">
        <Menu className="h-6 w-6 text-white" onClick={() => setIsOpen(true)} />
        <div className="flex min-w-0 items-center space-x-2">
          <Logo className="h-6 w-6" />
          <TitleSection careerName={careerName} planName={planName} studentName={studentName} />
        </div>
      </div>
      {/* Desktop Nav */}
      <nav className="hidden md:flex w-full border-b border-gray-700 shadow-sm overflow-x-auto" style={{ backgroundColor: '#21262d' }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left side - Logo, title and upload */}
            <div className="flex items-center space-x-4">
              <Logo />
              <TitleSection careerName={careerName} planName={planName} studentName={studentName} />
              <ImportPlanButton onImport={onImport} />
              <ShareMobileButton onCreateLink={onCreateMobileShareLink} />
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
          </div>
        </div>
      </nav>
      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Sidebar container */}
          <div className="w-64 bg-[#21262d] p-4 flex flex-col">
            {/* Close button */}
            <div className="flex justify-end">
              <X className="h-6 w-6 text-white" onClick={() => setIsOpen(false)} />
            </div>
            {/* Scrollable content */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-4">
              <Logo />
              <TitleSection careerName={careerName} planName={planName} studentName={studentName} />
              <ImportPlanButton onImport={onImport} />
              <ShareMobileButton onCreateLink={onCreateMobileShareLink} />
              <SubjectInfo
                selectedSubject={selectedSubject}
                nodes={nodes}
                onStatusChange={onStatusChange}
                onGradeChange={onGradeChange}
              />
            </div>
            {/* Fixed footer removed: DeveloperInfo moved to bottom bar */}
          </div>
          {/* Overlay to close */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
