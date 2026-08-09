/* eslint-disable @typescript-eslint/no-explicit-any */
// Modal cluster extracted verbatim from LDAdminDashboard.tsx (keeps the shell
// under the 800-line cap). Fed the same adminCtx object the tab components use.
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, CheckCircle } from 'lucide-react';
import ApiService from '../../services/ApiService';
import AssignmentCreationModal from '../dashboard/AssignmentCreationModal';
import CourseEnrollmentModal from '../dashboard/CourseEnrollmentModal';
import CodingQuestionModal from '../dashboard/CodingQuestionModal';
import BankCreationModal from '../dashboard/BankCreationModal';
import UserIntelPanel from '../dashboard/UserIntelPanel';
import { ResourceModal, DeleteModal, BulkAddModal, CreationModal } from './AdminModals';
import type { AdminTabCtx } from './tabs/types';

export default function LDAdminModals({ ctx }: { ctx: AdminTabCtx }) {
  const {
    toast, tree, user, fetchData, processing, courses, taskData, nodeDetails,
    showAddModal, setShowAddModal, showEditModal, setShowEditModal,
    showDeleteConfirm, setShowDeleteConfirm, showTaskModal, setShowTaskModal,
    showAssignmentModal, setShowAssignmentModal, showCourseModal, setShowCourseModal,
    showCodingModal, setShowCodingModal, showBankModal, setShowBankModal,
    selectedUserDetails, setSelectedUserDetails, onViewPremium,
    handleAdd, handleUpdateResource, handleDeleteResource,
  } = ctx;
  return (
      <AnimatePresence>
        {showAddModal && showAddModal.type === 'BulkUser' ? (
          <BulkAddModal
            onClose={() => setShowAddModal(null)}
            tree={tree}
            currentUser={user}
            onSubmit={async (groupId: number, userList: any[]) => {
              try {
                await ApiService.bulkAddUsers(groupId, userList);
                toast('success', `Onboarded ${userList.length} users successfully`);
                setShowAddModal(null);
                fetchData();
              } catch (err: any) {
                toast('error', err.message);
              }
            }}
          />
        ) : showAddModal && (
          <CreationModal
            type={showAddModal.type}
            onClose={() => setShowAddModal(null)}
            onSubmit={handleAdd}
          />
        )}
        {showAssignmentModal && (
          <AssignmentCreationModal
            initialTargetType={nodeDetails?.action === 'MANDATE' ? (nodeDetails.targetType as any) : undefined}
            initialTargetId={nodeDetails?.action === 'MANDATE' ? nodeDetails.id : undefined}
            onClose={() => setShowAssignmentModal(false)}
            onCreated={() => { setShowAssignmentModal(false); fetchData(); }}
          />
        )}
        {showCodingModal && (
          <CodingQuestionModal
            user={user}
            courses={courses}
            onClose={() => setShowCodingModal(false)}
            onCreated={() => { setShowCodingModal(false); fetchData(); }}
          />
        )}
        {showEditModal && (
          <ResourceModal
            type={showEditModal.type}
            initialName={showEditModal.name}
            onClose={() => setShowEditModal(null)}
            onSubmit={handleUpdateResource}
            mode="EDIT"
          />
        )}
        {showDeleteConfirm && (
          <DeleteModal
            type={showDeleteConfirm.type}
            name={showDeleteConfirm.name}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={handleDeleteResource}
            processing={processing}
          />
        )}
        {showBankModal && (
          <BankCreationModal
            user={user}
            courses={courses}
            onClose={() => setShowBankModal(false)}
            onCreated={() => { setShowBankModal(false); fetchData(); }}
          />
        )}
        {selectedUserDetails && (
          <UserIntelPanel
            userId={selectedUserDetails.id}
            onClose={() => setSelectedUserDetails(null)}
            onViewPremium={onViewPremium}
          />
        )}
        {showCourseModal && (
          <CourseEnrollmentModal
            onClose={() => setShowCourseModal(false)}
            onEnrolled={() => { setShowCourseModal(false); fetchData(); }}
          />
        )}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-surface-container border border-surface-bright rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-surface-bright flex justify-between items-center bg-[var(--color-surface-container)]/50">
                <div>
                  <h3 className="text-xl font-black text-[var(--color-on-surface)] flex items-center gap-2">
                    <Terminal className="text-[var(--color-brand-primary)]" size={24} /> System Task Monitor
                  </h3>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mt-1">
                    Live Background Job Telemetry
                  </p>
                </div>
                <button onClick={() => setShowTaskModal(false)} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-surface-dim)]">
                {taskData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--color-on-surface-variant)]">
                    <CheckCircle size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">No active or recent tasks found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskData.map((task, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                              task.status === 'COMPLETED' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' :
                              task.status === 'FAILED' ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]' :
                              task.status === 'RUNNING' ? 'bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)]' :
                              'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                            }`}>
                              {task.status || 'UNKNOWN'}
                            </span>
                            <span className="text-sm font-bold text-[var(--color-on-surface)]">{task.task_name}</span>
                          </div>
                          {task.error_message && (
                            <p className="text-xs text-[var(--color-danger)] font-mono bg-[var(--color-danger)]/5 p-2 rounded-lg border border-[var(--color-danger)]/10 mb-2">
                              {task.error_message}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-[10px] text-[var(--color-on-surface-variant)] font-mono">
                            <span>Started: {new Date(task.started_at).toLocaleString()}</span>
                            {task.completed_at && <span>Completed: {new Date(task.completed_at).toLocaleString()}</span>}
                            <span>Target ID: {task.target_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
