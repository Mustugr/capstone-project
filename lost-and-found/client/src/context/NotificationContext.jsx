import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { connectSocket } from "../lib/socket";

const MESSAGES_PATHS = new Set(["/student-messages", "/admin-message"]);
const OVERVIEW_PATH = "/admin-overview";

const NotificationContext = createContext({ unreadMessages: 0, pendingReports: 0 });

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!user) return;
    const sock = connectSocket();
    if (!sock) return;

    const onNewMessage = (msg) => {
      if (msg.sender_id === userRef.current?.id) return;
      if (MESSAGES_PATHS.has(locationRef.current?.pathname)) return;
      setUnreadMessages((n) => n + 1);
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
    if (MESSAGES_PATHS.has(location.pathname)) setUnreadMessages(0);
    if (location.pathname === OVERVIEW_PATH)   setPendingReports(0);
  }, [location.pathname]);

  return (
    <NotificationContext.Provider value={{ unreadMessages, pendingReports }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
