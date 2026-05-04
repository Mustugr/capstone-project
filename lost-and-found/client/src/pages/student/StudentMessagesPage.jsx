import { useEffect, useState, useRef } from "react";
import StudentSidebar from "../../components/StudentSidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./StudentMessagesPage.css";

export default function StudentMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations]       = useState([]);
  const [selectedId, setSelectedId]             = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [message, setMessage]                   = useState("");
  const [loadingConvos, setLoadingConvos]        = useState(true);
  const [loadingMessages, setLoadingMessages]    = useState(false);
  const threadRef = useRef(null);

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
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedId) return;
    try {
      const sent = await api.post(`/messages/${selectedId}`, { content: message.trim() });
      setMessages((prev) => [...prev, sent]);
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
            {!selected ? (
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
