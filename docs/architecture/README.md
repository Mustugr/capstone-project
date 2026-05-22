# Architecture diagrams

C4 model for the **Lost & Found Portal**. The authoritative source is
[`workspace.dsl`](workspace.dsl) (Structurizr DSL); the Mermaid diagrams below
mirror it so the views render directly on GitHub.

Three views:

- **C1 — System Context** — who uses the portal and what external systems it talks to.
- **C2 — Containers** — runtime pieces of the system (SPA, API, DB, object storage).
- **C3 — Components** — internal makeup of the API container.

To regenerate from the DSL, paste `workspace.dsl` into the online viewer at
<https://structurizr.com/dsl>, or run `structurizr-cli export -workspace workspace.dsl -format png`.

---

## C1 — System Context

```mermaid
C4Context
    title System Context — Lost & Found Portal

    Person(student, "Student", "Files lost reports (gets LF-XXXXXX ticket), chats with Hawk AI, messages admins about own cases.")
    Person(admin, "Administrator", "Logs found items, reviews claims, verifies ownership in chat, matches and resolves cases.")

    System(laf, "Lost & Found Portal", "Front door to the lost-and-found office. Students never browse inventory; admins verify and release in person.")

    System_Ext(claudeApi, "Anthropic Claude API", "Claude Haiku 4.5. Sandboxed: only two server-defined tools; never sees item data or PII.")

    Rel(student, laf, "Files reports, chats with Hawk AI, messages admins", "HTTPS + WSS")
    Rel(admin, laf, "Logs found items, reviews claims, verifies in chat", "HTTPS + WSS")
    Rel(laf, claudeApi, "Sends prompts + 2 tool schemas; no item names/PII", "HTTPS / JSON")
```

---

## C2 — Containers

```mermaid
C4Container
    title Container view — Lost & Found Portal

    Person(student, "Student")
    Person(admin, "Administrator")
    System_Ext(claudeApi, "Anthropic Claude API", "Claude Haiku 4.5 — 2 sandboxed tools, no DB access")

    System_Boundary(laf, "Lost & Found Portal") {
        Container(webApp, "Web Application", "React 19, Vite 7, React Router 7, socket.io-client 4", "Student + admin SPA on Vercel. Session token in localStorage; AuthContext + NotificationContext drive sidebar badges.")
        Container(api, "API Application", "Node.js, Express 4, Socket.io 4", "REST + WebSocket backend on Render. Auth, business logic, uploads, real-time messaging, claim review, AI orchestration, audit logging.")
        ContainerDb(db, "Database", "PostgreSQL 15 (Supabase)", "profiles, lost_reports, found_items, messages, claims, chat_logs")
        Container(storage, "Object Storage", "Supabase Storage", "Found-item images; public URLs persisted in DB")
    }

    Rel(student, webApp, "Uses", "HTTPS")
    Rel(admin, webApp, "Uses", "HTTPS")

    Rel(webApp, api, "REST API calls + multipart uploads", "JSON / HTTPS")
    Rel(webApp, api, "Real-time: message:new, report:new, typing:start/stop", "WSS / Socket.io")

    Rel(api, db, "Reads / writes", "SQL / TLS")
    Rel(api, storage, "Uploads images and reads public URLs", "HTTPS")
    Rel(api, claudeApi, "messages.create with 2 tool definitions; tools run server-side", "HTTPS / JSON")
```

---

## C3 — Components (inside the API)

```mermaid
C4Component
    title Component view — API Application

    Container_Ext(webApp, "Web Application", "React 19, Vite 7")
    ContainerDb_Ext(db, "Database", "PostgreSQL 15")
    Container_Ext(storage, "Object Storage", "Supabase Storage")
    System_Ext(claudeApi, "Anthropic Claude API", "Claude Haiku 4.5")

    Container_Boundary(api, "API Application") {
        Component(authMW, "Auth Middleware", "Express middleware", "Verifies Bearer JWT, attaches req.user. requireAdmin gates admin-only routes.")
        Component(chatLimit, "Chat Rate-limit & Lockout", "Express middleware", "30 messages/day, 10 tool calls/day per user; honors profiles.chat_locked_until (14d on fraud).")

        Component(authR, "Auth Routes", "Express Router", "Register, login, /me. bcrypt + 7-day JWT (role embedded).")
        Component(reportsR, "Reports Routes", "Express Router", "Lost-report CRUD + match/unmatch/resolve (transactional). Generates unique LF-XXXXXX tickets.")
        Component(foundR, "Found Items Routes", "Express + multer", "Found-item CRUD. Uploads images to Supabase Storage; persists public URL.")
        Component(msgR, "Messages Routes", "Express Router", "Send/list messages. Emits message:new. Receives auto-messages from claim approve/reject.")
        Component(claimsR, "Claims Routes", "Express Router", "GET claims, approve/reject. Reject-as-fraud sets chat_locked_until = NOW()+14d.")
        Component(chatR, "Chat Routes (Hawk AI)", "Express + @anthropic-ai/sdk", "POST /api/chat. Claude tool-use loop (max 5 iters). Server-side guards; logs every turn to chat_logs.")

        Component(sock, "Socket.io Server", "Socket.io", "JWT-authenticated handshake. user:{id} rooms + admin room. Relays message:new, report:new, typing:*.")
        Component(pool, "Database Pool", "node-postgres", "PostgreSQL connection pool with SSL enforced.")
    }

    Rel(webApp, authR, "POST /api/auth/{register,login} · GET /api/auth/me", "HTTPS")
    Rel(webApp, reportsR, "GET / POST / PATCH /api/reports/*", "HTTPS")
    Rel(webApp, foundR, "GET / POST /api/found-items", "HTTPS / multipart")
    Rel(webApp, msgR, "GET / POST /api/messages/*", "HTTPS")
    Rel(webApp, claimsR, "GET / PATCH /api/claims/*", "HTTPS")
    Rel(webApp, chatR, "POST /api/chat", "HTTPS")
    Rel(webApp, sock, "Authenticated WebSocket + typing events", "WSS + JWT")

    Rel(authMW, authR, "Protects /me")
    Rel(authMW, reportsR, "Protects; requireAdmin on match/unmatch/resolve")
    Rel(authMW, foundR, "Protects; requireAdmin on writes")
    Rel(authMW, msgR, "Protects all routes")
    Rel(authMW, claimsR, "requireAdmin on all routes")
    Rel(authMW, chatR, "Protects POST /api/chat")

    Rel(chatLimit, chatR, "Applied before handler; 403 lockout / 429 daily limit")

    Rel(authR, pool, "Reads/writes profiles")
    Rel(reportsR, pool, "Reads/writes lost_reports (+ found_items in txns)")
    Rel(foundR, pool, "Reads/writes found_items")
    Rel(msgR, pool, "Reads/writes messages")
    Rel(claimsR, pool, "Writes claims + profiles.chat_locked_until on fraud")
    Rel(chatR, pool, "Boolean check on found_items; writes claims, chat_logs")
    Rel(chatLimit, pool, "Reads profiles.chat_locked_until")

    Rel(pool, db, "Runs SQL", "TCP/TLS")

    Rel(foundR, storage, "Uploads image buffers; stores public URL", "HTTPS")

    Rel(reportsR, sock, "Emits report:new to admin room")
    Rel(msgR, sock, "Emits message:new to admin + user:{studentId}")
    Rel(claimsR, msgR, "Inserts ticketed system message on approve/reject")

    Rel(chatR, claudeApi, "Tool-use loop; never grants raw query power to the model", "HTTPS / JSON")
```
