'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Trash2, Lock, Unlock, Loader2, AlertTriangle
} from 'lucide-react';
import ApiService from '../../../services/ApiService';
import { useToast } from '../../ui/Toast';

interface GovernanceItem {
  content_type: 'bank' | 'coding_question' | 'kt_document';
  id: number | string;
  title: string;
  author_name: string;
  visibility: string;
  status: 'active' | 'quarantined';
  created_at: string;
}

export default function GovernanceTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<GovernanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'' | 'bank' | 'coding_question' | 'kt_document'>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'quarantined'>('');
  const [showQuarantineModal, setShowQuarantineModal] = useState<any>(null);
  const [quarantineReason, setQuarantineReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  useEffect(() => {
    fetchGovernanceContent();
  }, []);

  const fetchGovernanceContent = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getGovernanceContent({
        type: contentTypeFilter || undefined,
        q: searchQuery || undefined,
        status: statusFilter || undefined
      });
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast('error', `Failed to load governance content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleContentTypeChange = (type: '' | 'bank' | 'coding_question' | 'kt_document') => {
    setContentTypeFilter(type);
  };

  const handleStatusChange = (status: '' | 'active' | 'quarantined') => {
    setStatusFilter(status);
  };

  const handleApplyFilters = () => {
    fetchGovernanceContent();
  };

  const handleQuarantine = async () => {
    if (!showQuarantineModal || !quarantineReason.trim()) {
      toast('error', 'Please provide a quarantine reason');
      return;
    }

    setProcessing(true);
    try {
      await ApiService.quarantineContent(
        showQuarantineModal.content_type,
        showQuarantineModal.id,
        quarantineReason
      );
      toast('success', `Content quarantined: ${showQuarantineModal.title}`);
      setShowQuarantineModal(null);
      setQuarantineReason('');
      fetchGovernanceContent();
    } catch (err: any) {
      toast('error', `Quarantine failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnquarantine = async (item: GovernanceItem) => {
    setProcessing(true);
    try {
      await ApiService.unquarantineContent(item.content_type, item.id);
      toast('success', `Content restored: ${item.title}`);
      fetchGovernanceContent();
    } catch (err: any) {
      toast('error', `Restore failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (item: GovernanceItem) => {
    setProcessing(true);
    try {
      if (item.content_type === 'bank') {
        await ApiService.deleteBank(Number(item.id));
      } else if (item.content_type === 'coding_question') {
        await ApiService.deleteCodingQuestion(Number(item.id));
      } else if (item.content_type === 'kt_document') {
        await ApiService.deleteKTDocument(String(item.id));
      }
      toast('success', `Content deleted: ${item.title}`);
      setDeleteConfirm(null);
      fetchGovernanceContent();
    } catch (err: any) {
      toast('error', `Delete failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank':
        return 'Question Bank';
      case 'coding_question':
        return 'Coding Question';
      case 'kt_document':
        return 'KT Document';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string, visibility: string) => {
    const isPersonal = visibility === 'personal';
    const statusColor = status === 'quarantined' ? 'bg-red-500/20 text-red-700' : 'bg-green-500/20 text-green-700';
    const visibilityColor = isPersonal ? 'bg-amber-500/20 text-amber-700' : 'bg-blue-500/20 text-blue-700';

    return (
      <div className="flex gap-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
          {status === 'quarantined' ? 'Quarantined' : 'Active'}
        </span>
        {isPersonal && (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${visibilityColor}`}>
            Personal
          </span>
        )}
      </div>
    );
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !contentTypeFilter || item.content_type === contentTypeFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="bg-surface-container border border-surface-bright rounded-[3rem] p-8">
        <h3 className="text-2xl font-black text-[var(--color-on-surface)]">Content Governance</h3>
        <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.3em] mt-1">
          Manage & Monitor All Content
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface-container border border-surface-bright rounded-[3rem] p-8 space-y-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-xl text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-on-surface-variant)] mb-2 uppercase tracking-wider">
              Content Type
            </label>
            <select
              value={contentTypeFilter}
              onChange={(e) => handleContentTypeChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg text-[var(--color-on-surface)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All Types</option>
              <option value="bank">Question Banks</option>
              <option value="coding_question">Coding Questions</option>
              <option value="kt_document">KT Documents</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-on-surface-variant)] mb-2 uppercase tracking-wider">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg text-[var(--color-on-surface)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="quarantined">Quarantined</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyFilters}
              className="w-full px-4 py-2 bg-[var(--color-brand-primary-container)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
            >
              <Filter size={16} className="inline mr-2" /> Apply
            </button>
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-surface-container border border-surface-bright rounded-[3rem] p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="mx-auto mb-4 text-[var(--color-on-surface-variant)]" />
            <p className="text-[var(--color-on-surface-variant)]">No content found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-outline)]">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Title</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Author</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Created</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <motion.tr
                    key={`${item.content_type}-${item.id}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-bright)] transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--color-on-surface)]">
                      {getTypeLabel(item.content_type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">{item.title}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{item.author_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.status, item.visibility)}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {item.status === 'quarantined' ? (
                        <button
                          onClick={() => handleUnquarantine(item)}
                          disabled={processing}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-700 rounded-lg font-semibold text-xs hover:bg-green-500/30 transition-all disabled:opacity-50"
                        >
                          <Unlock size={14} /> Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowQuarantineModal(item)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-700 rounded-lg font-semibold text-xs hover:bg-amber-500/30 transition-all"
                        >
                          <Lock size={14} /> Quarantine
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-700 rounded-lg font-semibold text-xs hover:bg-red-500/30 transition-all"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quarantine Modal */}
      <AnimatePresence>
        {showQuarantineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowQuarantineModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline)] rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-black text-[var(--color-on-surface)] mb-4">
                Quarantine Content
              </h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
                {showQuarantineModal.title}
              </p>
              <textarea
                placeholder="Reason for quarantine..."
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] mb-6 text-sm"
                rows={4}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowQuarantineModal(null);
                    setQuarantineReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-lg font-semibold text-sm hover:opacity-80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuarantine}
                  disabled={processing || !quarantineReason.trim()}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 size={16} className="inline animate-spin mr-2" /> : null}
                  Quarantine
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline)] rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-black text-[var(--color-on-surface)] mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" /> Delete Content
              </h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
                Are you sure you want to permanently delete <strong>{deleteConfirm.title}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-lg font-semibold text-sm hover:opacity-80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 size={16} className="inline animate-spin mr-2" /> : null}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
