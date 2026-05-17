import { useEffect, useState, useRef, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import StudentSidebar from "../../components/StudentSidebar";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import hawkAiUrl from "../../assets/hawk.svg";
import "./StudentMessagesPage.css";

const HAWK_AI_ID = "hawk-ai";

function HawkAvatar({ size = 36 }) {
  return (
    <div className="hawk-avatar" style={{ width: size, height: size }}>
      <img src={hawkAiUrl} alt="Hawk AI" />
    </div>
  );
}

const HAWK_WELCOME = {
  role: "assistant",
  content:
    "👋 Hi! I'm Hawk AI. Tell me what you lost — I'll search the database before you contact admin. Try: \"I lost a black backpack near the library\".",
};

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

export default function StudentMessagesPage() {
  const { user } = useAuth();
  const { unreadByReport, markReportRead } = useNotifications();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations]       = useState([]);
  const [selectedId, setSelectedId]             = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [message, setMessage]                   = useState("");
  const [loadingConvos, setLoadingConvos]       = useState(true);
  const [loadingMessages, setLoadingMessages]   = useState(false);
  const [hawkMessages, setHawkMessages]         = useState([HAWK_WELCOME]);
  const [hawkInput, setHawkInput]               = useState("");
  const [hawkLoading, setHawkLoading]           = useState(false);
  const [adminTyping, setAdminTyping]           = useState(false);
  const threadRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const isHawkAI = selectedId === HAWK_AI_ID;

  useEffect(() => {
    api.get("/messages")
      .then((data) => {
        setConversations(data);
        const paramId = searchParams.get("reportId");
        const isDesktop = !window.matchMedia("(max-width: 768px)").matches;
        if (paramId) {
          setSelectedId(Number(paramId));
        } else if (isDesktop && data.length > 0) {
          setSelectedId(data[0].report_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    if (!selectedId || selectedId === HAWK_AI_ID) return;
    setLoadingMessages(true);
    api.get(`/messages/${selectedId}`)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, hawkMessages, adminTyping]);

  useEffect(() => {
    setAdminTyping(false);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && selectedId !== HAWK_AI_ID) {
      markReportRead(selectedId);
    }
  }, [selectedId, markReportRead]);

  useEffect(() => {
    const sock = connectSocket();
    if (!sock) return;

    const onNewMessage = (msg) => {
      if (msg.report_id === selectedId) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id !== user?.id) markReportRead(selectedId);
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
      if (data.report_id === selectedId && data.sender_role === "admin") {
        setAdminTyping(true);
      }
    };
    const onTypingStop = (data) => {
      if (data.report_id === selectedId && data.sender_role === "admin") {
        setAdminTyping(false);
      }
    };

    const onReadUpdate = ({ report_id, role_that_read, read_at }) => {
      if (report_id !== selectedId) return;
      if (role_that_read === user?.role) return; // we're the reader; receipts are for the sender
      const readMs = new Date(read_at).getTime();
      setMessages((prev) => prev.map((m) => {
        if (m.sender_role !== user?.role) return m;
        if (m.read_by_other) return m;
        const created = new Date(m.created_at).getTime();
        return created <= readMs ? { ...m, read_by_other: true } : m;
      }));
    };

    sock.on("message:new",   onNewMessage);
    sock.on("typing:start",  onTypingStart);
    sock.on("typing:stop",   onTypingStop);
    sock.on("read:update",   onReadUpdate);
    return () => {
      sock.off("message:new",   onNewMessage);
      sock.off("typing:start",  onTypingStart);
      sock.off("typing:stop",   onTypingStop);
      sock.off("read:update",   onReadUpdate);
    };
  }, [selectedId, user?.id, user?.role]);

  const selectConversation = (id) => {
    setSelectedId(id);
    if (id && id !== HAWK_AI_ID) markReportRead(id);
  };

  const emitTyping = () => {
    if (!selectedId || selectedId === HAWK_AI_ID) return;
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
    if (!selectedId || selectedId === HAWK_AI_ID) return;
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    emitTyping();
  };

  const handleSendHawk = async () => {
    if (!hawkInput.trim() || hawkLoading) return;
    const userMsg = { role: "user", content: hawkInput.trim() };
    const next = [...hawkMessages, userMsg];
    setHawkMessages(next);
    setHawkInput("");
    setHawkLoading(true);
    try {
      const apiMessages = next.filter((m) => m !== HAWK_WELCOME).map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post("/chat", { messages: apiMessages });
      setHawkMessages([...next, { role: "assistant", content: res.message }]);
    } catch (err) {
      setHawkMessages([...next, { role: "assistant", content: `Sorry, I hit an error: ${err.message}` }]);
    } finally {
      setHawkLoading(false);
    }
  };

  const handleHawkKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendHawk(); }
  };

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  const selected = conversations.find((c) => c.report_id === selectedId);

  const badgeClass = (status) => {
    if (status === "Pending")  return "status-badge status-pending";
    if (status === "Matched")  return "status-badge status-matched";
    return "status-badge status-resolved";
  };

  return (
    <div className="student-layout">
      <StudentSidebar />

      <main className="student-messages">
        <div className={`student-messages__layout${selectedId ? " student-messages__layout--thread-open" : ""}`}>
          <aside className="student-card student-messages__left">
            <div className="student-messages__left-header">
              <span className="student-eyebrow">Inbox</span>
              <h2 className="student-messages__left-title">Messages</h2>
            </div>

            <button
              type="button"
              onClick={() => selectConversation(HAWK_AI_ID)}
              className={`hawk-ai-conversation${isHawkAI ? " active" : ""}`}
            >
              <HawkAvatar size={42} />
              <div className="hawk-ai-conversation__text">
                <strong>Ask Hawk AI</strong>
                <p>Search lost items instantly</p>
              </div>
            </button>

            {loadingConvos ? (
              <p style={{ padding: "20px", color: "var(--muted)", fontSize: 14 }}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p style={{ padding: "20px", color: "var(--muted)", fontSize: 14 }}>No reports yet.</p>
            ) : (
              conversations.map((c) => (
                <button key={c.report_id} onClick={() => selectConversation(c.report_id)}
                  className={`student-messages__conversation${c.report_id === selectedId ? " active" : ""}`}>
                  <div className="student-messages__conversation-top">
                    <strong>{c.item_name}</strong>
                    {unreadByReport[c.report_id] ? (
                      <span className="student-messages__unread">{unreadByReport[c.report_id]}</span>
                    ) : (
                      <span className={badgeClass(c.status)}>{c.status}</span>
                    )}
                  </div>
                  {c.ticket_number && <span className="ticket-tag ticket-tag--sm">{c.ticket_number}</span>}
                  <p>{c.last_message || "No messages yet"}</p>
                </button>
              ))
            )}
          </aside>

          <section className="student-card student-messages__right">
            {isHawkAI ? (
              <>
                <div className="hawk-ai-header">
                  <button
                    type="button"
                    className="student-messages__back"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                  >
                    ‹
                  </button>
                  <HawkAvatar size={44} />
                  <div>
                    <h2 className="hawk-ai-header__title">Hawk AI</h2>
                    <p className="hawk-ai-header__subtitle">AI assistant • Searches the lost &amp; found database</p>
                  </div>
                </div>

                <div className="student-messages__thread" ref={threadRef}>
                  {hawkMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`student-messages__message-wrap${msg.role === "user" ? " user" : " admin"}`}
                    >
                      <div
                        className={`student-messages__bubble${msg.role === "user" ? " user" : " hawk"}`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {hawkLoading && (
                    <div className="student-messages__message-wrap admin">
                      <div className="student-messages__bubble hawk hawk-typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="student-messages__input-row">
                  <input
                    value={hawkInput}
                    onChange={(e) => setHawkInput(e.target.value)}
                    onKeyDown={handleHawkKeyDown}
                    placeholder="Describe what you lost..."
                    disabled={hawkLoading}
                    className="student-input student-messages__input"
                  />
                  <button
                    onClick={handleSendHawk}
                    disabled={hawkLoading || !hawkInput.trim()}
                    className="student-lift-btn"
                  >
                    <span className="student-lift-btn__face">Send</span>
                  </button>
                </div>
              </>
            ) : !selected ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--muted)" }}>
                Select a report to view messages
              </div>
            ) : (
              <>
                <div className="student-messages__header">
                  <button
                    type="button"
                    className="student-messages__back"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                  >
                    ‹
                  </button>
                  <div className="student-messages__header-text">
                    <span className="student-eyebrow">Case</span>
                    <h2 className="student-messages__title">{selected.item_name}</h2>
                  </div>
                  <div className="student-messages__badges">
                    {selected.ticket_number && <span className="ticket-tag">{selected.ticket_number}</span>}
                    <span className={badgeClass(selected.status)}>{selected.status}</span>
                  </div>
                </div>

                <div className="student-messages__thread" ref={threadRef}>
                  {loadingMessages ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>No messages yet. Send one below.</p>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id || msg.sender_role === "student";
                      const prev = idx > 0 ? messages[idx - 1] : null;
                      const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at);
                      return (
                        <Fragment key={msg.id}>
                          {showDay && (
                            <div className="student-messages__day-separator">
                              <span>{dayLabel(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`student-messages__message-wrap${isMe ? " user" : " admin"}`}>
                            <div className={`student-messages__bubble${isMe ? " user" : " admin"}`}>
                              {msg.content}
                            </div>
                            <div className="student-messages__time">
                              {formatTime(msg.created_at)}
                              {isMe && (
                                <span
                                  className={`student-messages__receipt${msg.read_by_other ? " read" : ""}`}
                                  aria-label={msg.read_by_other ? "Read" : "Sent"}
                                  title={msg.read_by_other ? "Read" : "Sent"}
                                >
                                  {msg.read_by_other ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </Fragment>
                      );
                    })
                  )}
                  {adminTyping && (
                    <div className="student-messages__message-wrap admin">
                      <div className="student-messages__bubble admin hawk-typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="student-messages__input-row">
                  <input value={message} onChange={handleMessageChange}
                    onKeyDown={handleKeyDown} placeholder="Type a message..."
                    className="student-input student-messages__input" />
                  <button onClick={handleSend} disabled={!message.trim()} className="student-lift-btn">
                    <span className="student-lift-btn__face">Send</span>
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
