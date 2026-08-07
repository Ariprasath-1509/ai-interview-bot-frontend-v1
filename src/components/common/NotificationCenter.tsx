"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";

type Notification = {
  id: string;
  icon: string; // Changed to string
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
};

// Icon mapping
const iconMap = {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Bell,
};

const getNotificationIcon = (iconName: string) => {
  const IconComponent = (iconMap as any)[iconName];
  return IconComponent || Bell;
};

const POLL_INTERVAL_MS = 60_000;

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch immediately on mount (so the unread badge is correct before the user opens the panel),
  // then keep it fresh with light polling.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleScrollOrResize = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  function formatTime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const toggleOpen = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setIsOpen((v) => !v);
  };

  return (
    <div className="relative">
      {/* Bell Icon — white on the purple topbar, matching the other nav controls */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#5B2D8E]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — portal to <body> so it always renders on top, never clipped by header/nav overflow */}
      {isOpen && panelPos && mounted && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100] w-[min(340px,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 dark:border-[#2e224e] bg-white dark:bg-[#17112b] shadow-xl animate-dropdown"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#2e224e] px-4 py-3">
            <h3 className="font-semibold text-zinc-900 dark:text-[#ede8f5]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#1f1839]"
                aria-label="Close notifications"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-[#9585b3]">Loading...</div>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`cursor-pointer border-b border-zinc-100 dark:border-[#2e224e]/60 p-4 transition-colors hover:bg-purple-50/60 dark:hover:bg-purple-950/15 ${
                    !n.read ? "bg-purple-50/40 dark:bg-purple-950/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {(() => {
                        const IconComponent = getNotificationIcon(n.icon);
                        return <IconComponent size={16} className="text-purple-500 dark:text-purple-400" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-[#ede8f5]">{n.title}</p>
                        <span className="shrink-0 text-[11px] text-zinc-400 dark:text-[#6e5f8a]">{formatTime(n.time)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-[#9585b3]">{n.message}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-500" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto mb-3 text-zinc-300 dark:text-[#2e224e]" />
                <p className="text-sm text-zinc-500 dark:text-[#9585b3]">No notifications yet.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
