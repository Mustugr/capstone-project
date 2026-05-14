import { useEffect, useState, useRef, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import "./AdminMessagesPage.css";

function dayLabel(iso) {
  if (!iso) return "";
  const msgDate = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const msgDay = new Date(msgDate); msgDay.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - msgDay) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return msgDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations]    = useState([]);
  const [selectedId, setSelectedId]          = useState(null);
  const [messages, setMessages]              = useState([]);
  const [message, setMessage]                = useState("");
  const [loadingConvos, setLoadingConvos]    = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [studentTyping, setStudentTyping]    = useState(false);
  const [unread, setUnread]                  = useState({});
  const threadRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    api.get("/messages")
      .then((data) => {
        setConversations(data);
        const paramId = searchParams.get("reportId");
        if (paramId) {
          setSelectedId(Number(paramId));
        } else if (data.length > 0) {
          setSelectedId(data[0].report_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    api.get(`/messages/${selectedId}`)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, studentTyping]);

  useEffect(() => {
    setStudentTyping(false);
  }, [selectedId]);

  useEffect(() => {
    const sock = connectSocket();
    if (!sock) return;

    const onNewMessage = (msg) => {
      if (msg.report_id === selectedId) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      } else if (msg.sender_id !== user?.id) {
        setUnread((prev) => ({ ...prev, [msg.report_id]: (prev[msg.report_id] || 0) + 1 }));
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.report_id === msg.report_id
            ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
            : c
        )
      );
    };

    const onTypingStart = (data) => {
      if (data.report_id === selectedId && data.sender_role === "student") {
        setStudentTyping(true);
      }
    };
    const onTypingStop = (data) => {
      if (data.report_id === selectedId && data.sender_role === "student") {
        setStudentTyping(false);
      }
    };

    sock.on("message:new",   onNewMessage);
    sock.on("typing:start",  onTypingStart);
    sock.on("typing:stop",   onTypingStop);
    return () => {
      sock.off("message:new",   onNewMessage);
      sock.off("typing:start",  onTypingStart);
      sock.off("typing:stop",   onTypingStop);
    };
  }, [selectedId, user?.id]);

  const selectConversation = (id) => {
    setSelectedId(id);
    setUnread((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev }; delete next[id]; return next;
    });
  };

  const emitTyping = () => {
    if (!selectedId) return;
    const sock = connectSocket();
    if (!sock) return;
    if (!isTypingRef.current) {
      sock.emit("typing:start", { report_id: selectedId });
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sock.emit("typing:stop", { report_id: selectedId });
      isTypingRef.current = false;
    }, 2500);
  };

  const stopTypingNow = () => {
    if (!selectedId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      const sock = connectSocket();
      sock?.emit("typing:stop", { report_id: selectedId });
      isTypingRef.current = false;
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedId) return;
    stopTypingNow();
    try {
      const sent = await api.post(`/messages/${selectedId}`, { content: message.trim() });
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      setMessage("");
      setConversations((prev) =>
        prev.map((c) => c.report_id === selectedId ? { ...c, last_message: sent.content } : c)
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    emitTyping();
  };

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  const badgeClass = (status) => {
    if (status === "Pending")  return "status-badge status-pending";
    if (status === "Matched")  return "status-badge status-matched";
    return "status-badge status-resolved";
  };

  const selected = conversations.find((c) => c.report_id === selectedId);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-messages">
        <div className="admin-messages__layout">
          <aside className="admin-messages__left">
            <div className="admin-messages__left-header">Messages</div>

            {loadingConvos ? (
              <p style={{ padding: "20px", color: "var(--muted)", fontSize: 14 }}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p style={{ padding: "20px", color: "var(--muted)", fontSize: 14 }}>No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button key={c.report_id} onClick={() => selectConversation(c.report_id)}
                  className={`admin-messages__conversation${c.report_id === selectedId ? " active" : ""}`}>
                  <div className="admin-messages__conversation-top">
                    <strong>{c.item_name}</strong>
                    <span>{c.student_name}</span>
                  </div>
                  <div className="admin-messages__conversation-meta">
                    <span className={badgeClass(c.status)}>{c.status}</span>
                    <p>{c.last_message || "No messages yet"}</p>
                    {unread[c.report_id] ? (
                      <span className="admin-messages__unread">{unread[c.report_id]}</span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </aside>

          <section className="admin-messages__right">
            {!selected ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--muted)" }}>
                Select a conversation
              </div>
            ) : (
              <>
                <div className="admin-messages__header">
                  <h2>{selected.item_name}</h2>
                  <div className="admin-messages__badges">
                    <span className={badgeClass(selected.status)}>{selected.status}</span>
                    {selected.student_name && (
                      <span className="status-badge status-pending">{selected.student_name}</span>
                    )}
                  </div>
                </div>

                <div className="admin-messages__thread" ref={threadRef}>
                  {loadingMessages ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>No messages yet. Send one to start.</p>
                  ) : (
                    messages.map((msg, idx) => {
                      const isAdmin = msg.sender_role === "admin";
                      const prev = idx > 0 ? messages[idx - 1] : null;
                      const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at);
                      return (
                        <Fragment key={msg.id}>
                          {showDay && (
                            <div className="admin-messages__day-separator">
                              <span>{dayLabel(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`admin-messages__message-wrap${isAdmin ? " user" : " admin"}`}>
                            <div className={`admin-messages__bubble${isAdmin ? " user" : " admin"}`}>
                              {msg.content}
                            </div>
                            <div className="admin-messages__time">{formatTime(msg.created_at)}</div>
                          </div>
                        </Fragment>
                      );
                    })
                  )}
                  {studentTyping && (
                    <div className="admin-messages__message-wrap admin">
                      <div className="admin-messages__bubble admin admin-typing-bubble">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-messages__input-row">
                  <input value={message} onChange={handleMessageChange}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    placeholder="Type a message..." className="admin-messages__input" />
                  <button onClick={handleSend} disabled={!message.trim()} className="admin-lift-btn">
                    <span className="admin-lift-btn__face">Send</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
