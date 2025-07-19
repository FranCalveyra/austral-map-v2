"use client";

import React from 'react';
import { SubjectNode, SubjectStatus } from '@/types/curriculum';
import { Logo } from './logo';
import { TitleSection } from './title-section';
import { UploadButton } from './upload-button';
import { SubjectInfo } from './subject-info';
import { Menu, X, ChevronDown } from 'lucide-react';

interface NavbarProps {
  selectedSubject: SubjectNode | null;
  nodes: SubjectNode[];
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
  onGradeChange: (subjectId: string, grade: number) => void;
  onFileUpload: (file: File) => void;
  studentName?: string;
  planOptions: string[];
  selectedPlanName: string;
  onPlanSelect: (planName: string) => void;
}

export function Navbar({ selectedSubject, nodes, onStatusChange, onGradeChange, onFileUpload, studentName, planOptions, selectedPlanName, onPlanSelect }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#21262d]">
        <Menu className="h-6 w-6 text-white" onClick={() => setIsOpen(true)} />
        <div className="flex items-center space-x-2">
          <Logo className="h-6 w-6" />
          <TitleSection studentName={studentName} />
        </div>
      </div>
      {/* Desktop Nav */}
      <nav className="hidden md:flex w-full border-b border-gray-700 shadow-sm overflow-x-auto" style={{ backgroundColor: '#21262d' }}>
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
              <div className="relative inline-block">
                <select
                  value={selectedPlanName}
                  onChange={e => onPlanSelect(e.target.value)}
                  className="appearance-none bg-gray-800 text-white px-3 py-2 pr-8 rounded-md border border-gray-600"
                >
                  {planOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-300" />
              </div>
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
              <TitleSection studentName={studentName} />
              <UploadButton onFileUpload={onFileUpload} />
              <SubjectInfo
                selectedSubject={selectedSubject}
                nodes={nodes}
                onStatusChange={onStatusChange}
                onGradeChange={onGradeChange}
              />
              {/* Plan selector */}
              <div className="mt-4">
                <div className="relative inline-block w-full">
                  <select
                    value={selectedPlanName}
                    onChange={e => onPlanSelect(e.target.value)}
                    className="appearance-none bg-gray-800 text-white px-3 py-2 pr-8 rounded-md border border-gray-600 w-full"
                  >
                    {planOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-300" />
                </div>
              </div>
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