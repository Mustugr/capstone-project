import { useEffect, useState, useRef } from "react";
import StudentSidebar from "../../components/StudentSidebar";
import { useAuth } from "../../context/AuthContext";
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

export default function StudentMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations]       = useState([]);
  const [selectedId, setSelectedId]             = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [message, setMessage]                   = useState("");
  const [loadingConvos, setLoadingConvos]        = useState(true);
  const [loadingMessages, setLoadingMessages]    = useState(false);
  const [hawkMessages, setHawkMessages]         = useState([HAWK_WELCOME]);
  const [hawkInput, setHawkInput]               = useState("");
  const [hawkLoading, setHawkLoading]           = useState(false);
  const threadRef = useRef(null);

  const isHawkAI = selectedId === HAWK_AI_ID;

  useEffect(() => {
    api.get("/messages")
      .then((data) => {
        setConversations(data);
        if (data.length > 0) setSelectedId(data[0].report_id);
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
  }, [messages, hawkMessages]);

  useEffect(() => {
    const sock = connectSocket();
    if (!sock) return;

    const onNewMessage = (msg) => {
      if (msg.report_id === selectedId) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.report_id === msg.report_id
            ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
            : c
        )
      );
    };

    sock.on("message:new", onNewMessage);
    return () => { sock.off("message:new", onNewMessage); };
  }, [selectedId]);

  const handleSend = async () => {
    if (!message.trim() || !selectedId) return;
    try {
      const sent = await api.post(`/messages/${selectedId}`, { content: message.trim() });
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      setMessage("");
      // Update last_message in conversation list
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
        <div className="student-messages__layout">
          <aside className="student-card student-messages__left">
            <div className="student-messages__left-header">
              <span className="student-eyebrow">Inbox</span>
              <h2 className="student-messages__left-title">Messages</h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(HAWK_AI_ID)}
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
                <button key={c.report_id} onClick={() => setSelectedId(c.report_id)}
                  className={`student-messages__conversation${c.report_id === selectedId ? " active" : ""}`}>
                  <div className="student-messages__conversation-top">
                    <strong>{c.item_name}</strong>
                    <span className={badgeClass(c.status)}>{c.status}</span>
                  </div>
                  <p>{c.last_message || "No messages yet"}</p>
                </button>
              ))
            )}
          </aside>

          <section className="student-card student-messages__right">
            {isHawkAI ? (
              <>
                <div className="hawk-ai-header">
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
                  <span className="student-eyebrow">Case</span>
                  <h2 className="student-messages__title">{selected.item_name}</h2>
                  <div className="student-messages__badges">
                    <span className={badgeClass(selected.status)}>{selected.status}</span>
                  </div>
                </div>

                <div className="student-messages__thread" ref={threadRef}>
                  {loadingMessages ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>No messages yet. Send one below.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id || msg.sender_role === "student";
                      return (
                        <div key={msg.id} className={`student-messages__message-wrap${isMe ? " user" : " admin"}`}>
                          <div className={`student-messages__bubble${isMe ? " user" : " admin"}`}>
                            {msg.content}
                          </div>
                          <div className="student-messages__time">{formatTime(msg.created_at)}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="student-messages__input-row">
                  <input value={message} onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="Type a message..."
                    className="student-input student-messages__input" />
                  <button onClick={handleSend} className="student-lift-btn">
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
