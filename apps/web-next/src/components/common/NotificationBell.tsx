import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ApiService from '../../services/ApiService';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await ApiService.getUnreadCount();
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getNotifications();
      setNotifications(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiService.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-[var(--color-surface-container-highest)] dark:hover:bg-[var(--color-surface-container)] transition-colors"
      >
        <Bell className="w-6 h-6 text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-[10px] font-bold text-[var(--color-on-surface)] border-2 border-white dark:border-[var(--color-outline-variant)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white dark:bg-[var(--color-surface-dim)] rounded-xl shadow-2xl border border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)] z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)] flex justify-between items-center">
              <h3 className="font-bold text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]">Notifications</h3>
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--color-brand-primary)] dark:text-[var(--color-brand-primary)] hover:underline font-medium"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-[var(--color-on-surface-variant)] text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-[var(--color-on-surface-variant)] text-sm">No notifications found</div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 border-b border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] dark:hover:bg-[var(--color-surface-container)]/50 transition-colors ${!n.is_read ? 'bg-[var(--color-brand-primary-container)]/30 dark:bg-[var(--color-brand-primary-container)]/10' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 p-2 rounded-lg ${
                        n.type === 'assignment' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        n.type === 'mentor_comment' ? 'bg-[var(--color-warning)] text-[var(--color-warning)] dark:bg-[var(--color-warning)]/30 dark:text-[var(--color-warning)]' :
                        'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] dark:bg-[var(--color-surface-container)] dark:text-[var(--color-on-surface-variant)]'
                      }`}>
                        {n.type === 'assignment' ? <Clock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]">{n.title}</p>
                        <p className="text-xs text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface-variant)] mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface-variant)] mt-2">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-[var(--color-brand-primary-container)] mt-2 shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-[var(--color-surface-container-highest)] dark:bg-[var(--color-surface-container)]/50 text-center border-t border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)]">
               <button className="text-xs font-semibold text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)] transition-colors">
                 View All History
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
