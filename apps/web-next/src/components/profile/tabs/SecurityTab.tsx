'use client';
/* Extracted verbatim from UserProfile.tsx (5b decomposition). State and
   handlers arrive via the ctx object assembled in UserProfile. */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useRef } from 'react';
import {
  User, Mail, Building2, Linkedin, Globe, Code2, Video,
  BrainCircuit, ScrollText, Map, ShieldCheck, RefreshCcw, RefreshCw, ExternalLink,
  Flame, Github, Edit3, Plus, Trash2, Link2,
  TrendingUp, TrendingDown, Award, Zap, Target, Clock, BarChart3,
  CheckCircle2, XCircle, Layers, BookOpen, Star, Trophy, Cpu, Sparkles,
  X, GitBranch
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  Tooltip, AreaChart, Area, XAxis, YAxis,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import ApiService, { AIResponseEnvelope } from '../../../services/ApiService';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../ui/Toast';
import ActivityHeatmap from '../../common/ActivityHeatmap';
import ExecutiveGrowthAtlas from '../../dashboard/ExecutiveGrowthAtlas';
import { Activity, Camera, Save, Copy } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────
type TabId = 'INSIGHTS' | 'PERFORMANCE' | 'SKILLS' | 'GROWTH' | 'REGISTRY' | 'SECURITY';

interface ProfileEditState {
  full_name: string;
  profile_photo_url: string;
  intro_video_url: string;
  github_url: string;
  linkedin_url: string;
  leetcode_url: string;
  codolio_url: string;
  expertise_json: { skills: string[]; strengths: Record<string, number> };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
import { KPICard, Field } from './shared';
import type { ProfileTabCtx } from './types';

export default function SecurityTab({ ctx }: { ctx: ProfileTabCtx }) {
  const { profile, registry, vectors, quizAttempts, codingAttempts, allAttempts,
    avgQuiz, avgCoding, totalAttempts, streak, weightedProficiency,
    consistencyIndex, learningVelocity, weeklyActivity, growthAtlas,
    generatingAtlas, isOwnProfile, saving, newSkill, setNewSkill, skillInputRef,
    openEdit, handleSave, addSkill, removeSkill, handlePhotoUpload,
    handleSyncIntel, setShowEditModal, setActiveTab, onBack,
    currentUserId, slug, toast, loading,
    scoreHistory, scoreDistribution, radarData, expertiseSkills, strengthEntries } = ctx;
  return (
<>
{isOwnProfile && (
            <motion.div key="security" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-8 pb-16">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Password Management */}
                <div className="p-8 bg-[var(--color-surface-container)]/60 rounded-[2.5rem] border border-[var(--color-outline-variant)] space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-2xl flex items-center justify-center text-[var(--color-warning)]">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--color-on-surface)]">Change Credentials</h3>
                      <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-1">Strategic Identity Rotation</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2 block">Current Access Key</label>
                      <input 
                        type="password" 
                        id="current_password"
                        placeholder="••••••••"
                        className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 text-sm text-[var(--color-on-surface)] focus:border-[var(--color-warning)] outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2 block">New Access Key</label>
                      <input 
                        type="password" 
                        id="new_password"
                        placeholder="Min 8 characters"
                        className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 text-sm text-[var(--color-on-surface)] focus:border-[var(--color-success)] outline-none transition-colors"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        const curr = (document.getElementById('current_password') as HTMLInputElement).value;
                        const next = (document.getElementById('new_password') as HTMLInputElement).value;
                        if (!curr || !next) return toast('error', 'Both keys required for rotation.');
                        try {
                          await ApiService.changePassword(curr, next);
                          toast('success', 'Credentials rotated successfully.');
                          (document.getElementById('current_password') as HTMLInputElement).value = '';
                          (document.getElementById('new_password') as HTMLInputElement).value = '';
                        } catch (err: any) {
                          toast('error', err.message);
                        }
                      }}
                      className="w-full py-4 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                    >
                      Apply Rotation
                    </button>
                  </div>
                </div>

                {/* Session Management */}
                <div className="p-8 bg-[var(--color-surface-container)]/60 rounded-[2.5rem] border border-[var(--color-outline-variant)] space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-2xl flex items-center justify-center text-[var(--color-danger)]">
                      <RefreshCcw size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--color-on-surface)]">Session Control</h3>
                      <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-1">Global Access Revocation</p>
                    </div>
                  </div>

                  <div className="bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/10 rounded-2xl p-6">
                    <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                      Suspicious activity detected? You can immediately revoke all active sessions across all devices. This will invalidate your current session as well.
                    </p>
                    <button 
                      onClick={async () => {
                        if (!window.confirm("CRITICAL: This will log you out of ALL devices. Continue?")) return;
                        try {
                          await ApiService.logoutAll();
                          toast('success', 'Global revocation successful. Finalizing...');
                          setTimeout(() => ApiService.logout(), 2000);
                        } catch (err: any) {
                          toast('error', err.message);
                        }
                      }}
                      className="w-full py-4 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-[var(--color-on-surface)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                    >
                      Invoke Global Logout
                    </button>
                  </div>

                  <div className="bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded-2xl p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--color-danger)] mb-2">Delete account</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                      Permanently deactivate your account and erase your personal identifiers (name, email, credentials). This cannot be undone.
                    </p>
                    <button
                      onClick={async () => {
                        if (!window.confirm('This permanently deletes your account and personal data. This cannot be undone. Continue?')) return;
                        if (!window.confirm('Are you absolutely sure? Type of last confirmation — your account will be erased.')) return;
                        try {
                          await ApiService.deleteAccount();
                          toast('success', 'Your account has been deleted.');
                          setTimeout(() => ApiService.logout(), 1500);
                        } catch (err: any) {
                          toast('error', err.message || 'Failed to delete account');
                        }
                      }}
                      className="w-full py-4 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-[var(--color-on-surface)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
)}
{!isOwnProfile && (
             <motion.div key="security-locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                <ShieldCheck size={48} className="text-[var(--color-on-surface-variant)] mx-auto mb-4" />
                <h3 className="text-[var(--color-on-surface-variant)] font-bold">Security protocols are restricted to the identity owner.</h3>
             </motion.div>
)}
</>
  );
}
