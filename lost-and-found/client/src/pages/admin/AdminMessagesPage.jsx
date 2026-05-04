import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./AdminMessagesPage.css";

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations]    = useState([]);
  const [selectedId, setSelectedId]          = useState(null);
  const [messages, setMessages]              = useState([]);
  const [message, setMessage]                = useState("");
  const [loadingConvos, setLoadingConvos]    = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    api.get("/messages")
      .then((data) => {
        setConversations(data);
        // Deep-link from ?reportId or fall back to first conversation
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
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedId) return;
    try {
      const sent = await api.post(`/messages/${selectedId}`, { content: message.trim() });
      setMessages((prev) => [...prev, sent]);
      setMessage("");
      setConversations((prev) =>
        prev.map((c) => c.report_id === selectedId ? { ...c, last_message: sent.content } : c)
      );
    } catch (err) {
      alert(err.message);
    }
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
                <button key={c.report_id} onClick={() => setSelectedId(c.report_id)}
                  className={`admin-messages__conversation${c.report_id === selectedId ? " active" : ""}`}>
                  <div className="admin-messages__conversation-top">
                    <strong>{c.item_name}</strong>
                    <span>{c.student_name}</span>
                  </div>
                  <div className="admin-messages__conversation-meta">
                    <span className={badgeClass(c.status)}>{c.status}</span>
                    <p>{c.last_message || "No messages yet"}</p>
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
                    messages.map((msg) => {
                      const isAdmin = msg.sender_role === "admin";
                      return (
                        <div key={msg.id} className={`admin-messages__message-wrap${isAdmin ? " user" : " admin"}`}>
                          <div className={`admin-messages__bubble${isAdmin ? " user" : " admin"}`}>
                            {msg.content}
                          </div>
                          <div className="admin-messages__time">{formatTime(msg.created_at)}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="admin-messages__input-row">
                  <input value={message} onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    placeholder="Type a message..." className="admin-messages__input" />
                  <button onClick={handleSend} className="admin-lift-btn">
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
