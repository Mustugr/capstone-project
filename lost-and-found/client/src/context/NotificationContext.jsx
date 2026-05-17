import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { connectSocket } from "../lib/socket";
import { api } from "../lib/api";

const NotificationContext = createContext({
  unreadByReport: {},
  unreadTotal: 0,
  pendingReports: 0,
  markReportRead: () => {},
  markReportViewed: () => {},
});

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadByReport, setUnreadByReport] = useState({});
  const [pendingReports, setPendingReports] = useState(0);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const markReportRead = useCallback((reportId) => {
    setUnreadByReport((prev) => {
      if (!prev[reportId]) return prev;
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
    // Persist server-side so the read state survives tab close + reopen.
    // Fire-and-forget — local clearing already happened optimistically.
    api.post(`/messages/${reportId}/read`, {}).catch(() => {});
  }, []);

  // Decrement the unviewed-reports count by one. Caller is responsible for
  // having already PATCHed the report viewed server-side. Clamped at 0.
  const markReportViewed = useCallback(() => {
    setPendingReports((n) => Math.max(0, n - 1));
  }, []);

  // Admin: fetch the persistent unviewed-reports count on login / session restore.
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    api.get("/reports/unviewed-count")
      .then((data) => setPendingReports(data?.count ?? 0))
      .catch(console.error);
  }, [user]);

  // Both roles: fetch persistent per-conversation unread counts on login /
  // session restore. Without this, badges only reflect socket events since
  // the page loaded — anything missed while logged out wouldn't show.
  useEffect(() => {
    if (!user) return;
    api.get("/messages/unread-counts")
      .then((data) => setUnreadByReport(data || {}))
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const sock = connectSocket();
    if (!sock) return;

    const onNewMessage = (msg) => {
      if (msg.sender_id === userRef.current?.id) return;
      setUnreadByReport((prev) => ({
        ...prev,
        [msg.report_id]: (prev[msg.report_id] || 0) + 1,
      }));
    };

    const onNewReport = () => {
      if (userRef.current?.role !== "admin") return;
      setPendingReports((n) => n + 1);
    };

    sock.on("message:new", onNewMessage);
    sock.on("report:new",  onNewReport);
    return () => {
      sock.off("message:new", onNewMessage);
      sock.off("report:new",  onNewReport);
    };
  }, [user]);

  const unreadTotal = useMemo(
    () => Object.values(unreadByReport).reduce((a, b) => a + b, 0),
    [unreadByReport]
  );

  const value = useMemo(
    () => ({ unreadByReport, unreadTotal, pendingReports, markReportRead, markReportViewed }),
    [unreadByReport, unreadTotal, pendingReports, markReportRead, markReportViewed]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
