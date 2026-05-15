import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { connectSocket } from "../lib/socket";

const OVERVIEW_PATH = "/admin-overview";

const NotificationContext = createContext({
  unreadByReport: {},
  unreadTotal: 0,
  pendingReports: 0,
  markReportRead: () => {},
});

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadByReport, setUnreadByReport] = useState({});
  const [pendingReports, setPendingReports] = useState(0);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  const markReportRead = useCallback((reportId) => {
    setUnreadByReport((prev) => {
      if (!prev[reportId]) return prev;
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  }, []);

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
      if (locationRef.current?.pathname === OVERVIEW_PATH) return;
      setPendingReports((n) => n + 1);
    };

    sock.on("message:new", onNewMessage);
    sock.on("report:new",  onNewReport);
    return () => {
      sock.off("message:new", onNewMessage);
      sock.off("report:new",  onNewReport);
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname === OVERVIEW_PATH) setPendingReports(0);
  }, [location.pathname]);

  const unreadTotal = useMemo(
    () => Object.values(unreadByReport).reduce((a, b) => a + b, 0),
    [unreadByReport]
  );

  const value = useMemo(
    () => ({ unreadByReport, unreadTotal, pendingReports, markReportRead }),
    [unreadByReport, unreadTotal, pendingReports, markReportRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
