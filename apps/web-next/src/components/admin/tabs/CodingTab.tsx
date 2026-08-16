'use client';
/* Extracted verbatim from LDAdminDashboard.tsx (5b decomposition). */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, TrendingUp, ShieldCheck, Search, Plus,
  ChevronRight, ChevronDown, Layers, Settings, X,
  Filter, UserPlus, Database, Terminal, Target, Upload,
  Check, Loader2, ArrowLeft, Trash2, Mail, BadgeCheck, Download,
  Clock, Sparkles, BookmarkPlus, ShieldAlert, RefreshCw, FileText, Brain, Activity, Shield, Trophy,
  Play, CheckCircle, AlertCircle, Calendar, AlertTriangle, Info
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import ApiService, { ExecutiveSummary, BatchInsights } from '../../../services/ApiService';
import { useToast } from '../../ui/Toast';
import AssignmentCreationModal from '../../dashboard/AssignmentCreationModal';
import CourseEnrollmentModal from '../../dashboard/CourseEnrollmentModal';
import CodingQuestionModal from '../../dashboard/CodingQuestionModal';
import BankCreationModal from '../../dashboard/BankCreationModal';
import NotificationCenter from '../../common/NotificationCenter';
import { ComparisonChart, CompositeHealthGauge, EngagementDecayWidget, PerformanceDistributionChart, LeaderboardTable } from '../../dashboard/AnalyticsCharts';
import UserIntelPanel from '../../dashboard/UserIntelPanel';
import QuestionManagement from '../../dashboard/QuestionManagement';
import QuestionReportUI from '../../admin/QuestionReportUI';
import DataIntegrityDashboard from '../../dashboard/DataIntegrityDashboard';
import SystemHealthMonitor from '../../dashboard/SystemHealthMonitor';
import { StatCard, OrgNode, DeptNode, SystemHealthPanel, PerformanceMetricGrid } from '../../admin/AdminWidgets';
import { ResourceModal, DeleteModal, BulkAddModal, UserDetailsModal, CreationModal } from '../../admin/AdminModals';
import { AuditLogTable, EmailLogTable, QuestionReportTable, SecurityPulse } from '../../admin/AdminTables';

const filterTree = (nodes: any[], term: string): any[] => {
  if (!term || term.trim() === '') return nodes;
  const t = term.toLowerCase().trim();

  return nodes.map(node => {
    const name = (node.name || '').toLowerCase().trim();
    const matches = name.includes(t);

    // Recursive filtering for all possible child types
    const filteredDepts = node.departments ? filterTree(node.departments, term) : [];
    const filteredVerts = node.verticals ? filterTree(node.verticals, term) : [];
    const filteredBatches = node.batches ? filterTree(node.batches, term) : [];
    const filteredGroups = node.groups ? node.groups.filter((g: any) => (g.name || '').toLowerCase().trim().includes(t)) : [];

    // Return node if it matches OR any of its children match
    if (matches || filteredDepts.length > 0 || filteredVerts.length > 0 || filteredBatches.length > 0 || filteredGroups.length > 0) {
      return {
        ...node,
        departments: filteredDepts,
        verticals: filteredVerts,
        batches: filteredBatches,
        groups: filteredGroups
      };
    }
    return null;
  }).filter(Boolean);
};

import type { AdminTabCtx } from './types';

export default function CodingTab({ ctx }: { ctx: AdminTabCtx }) {
  const { toast, loading,
    setLoading,
    tree,
    setTree,
    stats,
    setStats,
    expandedNodes,
    setExpandedNodes,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showTaskModal,
    setShowTaskModal,
    taskData,
    setTaskData,
    ADMIN_TABS,
    activeTab,
    setActiveTabState,
    setActiveTab,
    users,
    setUsers,
    userSearch,
    setUserSearch,
    roleFilter,
    setRoleFilter,
    verticalFilter,
    setVerticalFilter,
    batchFilter,
    setBatchFilter,
    groupFilter,
    setGroupFilter,
    showAssignmentModal,
    setShowAssignmentModal,
    showCourseModal,
    setShowCourseModal,
    showCodingModal,
    setShowCodingModal,
    showBankModal,
    setShowBankModal,
    courses,
    setCourses,
    selectedUserDetails,
    setSelectedUserDetails,
    view,
    setView,
    nodeDetails,
    setNodeDetails,
    onboardingData,
    setOnboardingData,
    processing,
    setProcessing,
    individualUser,
    setIndividualUser,
    promoteId,
    setPromoteId,
    promoteRole,
    setPromoteRole,
    selectedUserIds,
    setSelectedUserIds,
    bulkProcessing,
    setBulkProcessing,
    newCourseName,
    setNewCourseName,
    addingCourse,
    setAddingCourse,
    bankCourseId,
    setBankCourseId,
    auditSubTab,
    setAuditSubTab,
    selectedAnalyticsBatch,
    setSelectedAnalyticsBatch,
    batchIntel,
    setBatchIntel,
    fetchingInsights,
    setFetchingInsights,
    executiveSummary,
    setExecutiveSummary,
    globalInsights,
    setGlobalInsights,
    fetchingGlobal,
    setFetchingGlobal,
    globalSummary,
    setGlobalSummary,
    codingQuestions,
    setCodingQuestions,
    addingCoding,
    setAddingCoding,
    codingLoading,
    setCodingLoading,
    codingFields,
    setCodingFields,
    getAllGroups,
    findGroupInTree,
    allPossibleGroups,
    getAllBatches,
    allPossibleBatches,
    fetchData,
    toggleNode,
    handleAdd,
    handleUpdateResource,
    handleDeleteResource,
    handleAddCourse,
    handleCreateCodingQuestion,
    fetchCodingQuestions,
    handleFetchBatchInsights,
    handleFetchGlobalInsights,
    globalMetrics,
    setGlobalMetrics,
    handleBulkAction,
    handleEmergencyReset,
    filteredUsers,
    user,
    onLogout,
    onViewReport,
    onViewPremium } = ctx;
  return (
<>
              <motion.div
                key="coding"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Coding Challenge Creator */}
                <div className="bg-surface-container border border-surface-bright rounded-[3rem] p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--color-on-surface)]">Coding Lab Management</h3>
                      <p className="text-[10px] text-[var(--color-success)] font-black uppercase tracking-[0.3em] mt-1">Algorithmic Challenge Registry</p>
                    </div>
                    <button
                      onClick={() => setShowCodingModal(true)}
                      className="px-6 py-3 bg-[var(--color-success)] text-[var(--color-surface-dim)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-success)] transition-all shadow-lg shadow-[var(--color-success)]/20 flex items-center gap-2"
                    >
                      <Plus size={14} /> New Challenge
                    </button>
                  </div>


                  {/* Coding Registry Table */}
                  <div className="bg-[var(--color-surface-container)]/50 border border-[var(--color-outline-variant)] rounded-[3rem] overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--color-outline-variant)]">
                          <th className="px-8 py-6 text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Challenge Title</th>
                          <th className="px-8 py-6 text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Course Sector</th>
                          <th className="px-8 py-6 text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">System ID</th>
                          <th className="px-8 py-6 text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(Array.isArray(codingQuestions) ? codingQuestions : []).map(q => (
                          <tr key={q.id} className="group hover:bg-[var(--color-surface-container-high)] transition-all">
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-[var(--color-on-surface)]">{q.title}</p>
                              <p className="text-[10px] text-[var(--color-on-surface-variant)] truncate max-w-xs">{q.description?.substring(0, 50)}...</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="px-3 py-1 rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-[10px] font-black uppercase border border-[var(--color-outline-variant)]">
                                {courses.find(c => c.id === q.course_id)?.name || 'General Registry'}
                              </span>
                            </td>
                            <td className="px-8 py-6 font-mono text-[10px] font-black text-brand-primary/60">
                              #{q.id}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Delete challenge "${q.title}"? This cannot be undone.`)) {
                                    setProcessing(true);
                                    ApiService.deleteCodingQuestion(q.id)
                                      .then(() => {
                                        toast('success', `Challenge "${q.title}" deleted`);
                                        fetchCodingQuestions();
                                      })
                                      .catch((err: any) => toast('error', `Delete failed: ${err.message}`))
                                      .finally(() => setProcessing(false));
                                  }
                                }}
                                disabled={processing}
                                className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50 transition-all"
                                title="Delete this coding question"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(Array.isArray(codingQuestions) ? codingQuestions : []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-8 py-20 text-center">
                              <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest italic">No coding challenges found in current registry.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
</>
  );
}
