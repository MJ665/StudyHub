'use client';

import React from 'react';
import { ChevronRight, Home, Building2, FolderKanban, Milestone, FileText } from 'lucide-react';
import { useKTNavStore } from '@/stores/ktNavStore';

export default function KTBreadcrumb() {
  const { 
    selectedCompany, 
    selectedProject, 
    selectedSprint,
    selectedDocId,
    currentView,
    setView,
    clearCompany,
    clearProject,
    selectSprint
  } = useKTNavStore();

  const handleHomeClick = () => {
    clearCompany();
  };

  const handleCompanyClick = () => {
    if (selectedCompany) {
      clearProject();
    }
  };

  const handleProjectClick = () => {
    if (selectedProject) {
      selectSprint(null);
      setView('documents');
    }
  };

  const handleSprintClick = () => {
    selectSprint(null);
  };

  return (
    <div className="flex items-center gap-2.5 px-8 py-4 border-b border-slate-900 bg-[var(--color-surface-dim)]/40 backdrop-blur-md text-xs font-semibold text-[var(--color-on-surface-variant)] overflow-x-auto scrollbar-hide select-none">
      
      {/* Organization Root */}
      <button 
        onClick={handleHomeClick}
        className="flex items-center gap-1.5 hover:text-[var(--color-brand-primary)] transition-colors text-[var(--color-on-surface-variant)]"
      >
        <Home size={14} />
        <span>Organization Hub</span>
      </button>

      {/* Company Level */}
      {selectedCompany && (
        <>
          <ChevronRight size={12} className="text-[var(--color-on-surface-variant)]" />
          <button
            onClick={handleCompanyClick}
            className={`flex items-center gap-1.5 transition-colors ${
              !selectedProject ? 'text-[var(--color-brand-primary)] font-bold' : 'hover:text-[var(--color-brand-primary)] text-[var(--color-on-surface-variant)]'
            }`}
          >
            <Building2 size={14} />
            <span>{selectedCompany.name}</span>
          </button>
        </>
      )}

      {/* Project Level */}
      {selectedProject && (
        <>
          <ChevronRight size={12} className="text-[var(--color-on-surface-variant)]" />
          <button
            onClick={handleProjectClick}
            className={`flex items-center gap-1.5 transition-colors ${
              currentView === 'documents' && !selectedSprint && !selectedDocId
                ? 'text-[var(--color-brand-primary)] font-bold' 
                : 'hover:text-[var(--color-brand-primary)] text-[var(--color-on-surface-variant)]'
            }`}
          >
            <FolderKanban size={14} />
            <span>{selectedProject.name}</span>
          </button>
        </>
      )}

      {/* Sprint Level */}
      {selectedSprint && (
        <>
          <ChevronRight size={12} className="text-[var(--color-on-surface-variant)]" />
          <button
            onClick={handleSprintClick}
            className="flex items-center gap-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)] transition-colors"
          >
            <Milestone size={14} />
            <span>{selectedSprint}</span>
          </button>
        </>
      )}

      {/* Document Level */}
      {selectedDocId && (
        <>
          <ChevronRight size={12} className="text-[var(--color-on-surface-variant)]" />
          <div className="flex items-center gap-1.5 text-[var(--color-brand-primary)] font-bold">
            <FileText size={14} />
            <span>Document Details</span>
          </div>
        </>
      )}

      {/* Action views (analytics, handoff, chat, keys) */}
      {!selectedDocId && !selectedSprint && (currentView === 'chat' || currentView === 'handoff' || currentView === 'keys' || currentView === 'analytics' || currentView === 'mentor-inbox' || currentView === 'discovery' || currentView === 'graph') && (
        <>
          <ChevronRight size={12} className="text-[var(--color-on-surface-variant)]" />
          <div className="flex items-center gap-1.5 text-[var(--color-brand-primary)] font-bold uppercase tracking-widest text-[10px]">
            <span>{currentView}</span>
          </div>
        </>
      )}

    </div>
  );
}
