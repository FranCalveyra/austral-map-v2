"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectInfoModal({ isOpen, onClose }: ProjectInfoModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/readme')
        .then(res => res.json())
        .then(data => {
          setContent(data.content || '');
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading README:', err);
          setContent('<p class="text-red-400">Error al cargar la información del proyecto.</p>');
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#21262d' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-2xl font-bold text-white">Acerca del Proyecto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-gray-300">Cargando información...</span>
            </div>
          ) : (
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-600" style={{ backgroundColor: '#1a1f26' }}>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
} 