workspace "Lost & Found Portal" "Architectural C4 model for the Hunter College Lost & Found Portal capstone — a full-stack web app that replaces the in-person lost-and-found office. Students file lost-item reports and chat with Hawk AI (an LLM-backed assistant) which acknowledges possible matches and collects structured ownership claims. Admins review the claims, verify ownership over an in-app chat, and authorize physical pickup. Students never see found-item inventory; verification is performed by humans (or deterministic server code), never by the AI." {

    model {

        // ────────────────────────────────────────────────────────────
        // People
        // ────────────────────────────────────────────────────────────
        student = person "Student" "A Hunter College student who has lost an item. Files lost reports (gets a unique LF-XXXXXX ticket), chats with Hawk AI, and exchanges messages with admins about their own cases."

        admin = person "Administrator" "Staff member responsible for the lost-and-found inventory. Logs found items with photos, reviews Hawk AI claims, matches lost reports to recovered items, chats with students to verify ownership, and resolves cases."

        // ────────────────────────────────────────────────────────────
        // External systems
        //
        // Security boundary around the Claude API:
        //   The model has NO direct database access. It can invoke exactly
        //   two server-defined tools:
        //
        //     - search_found_items(keywords, category?) → returns ONLY
        //       { match_found: boolean }. The model never sees item
        //       names, categories, descriptions, locations, dates, or
        //       storage info. Even a fully prompt-injected model cannot
        //       leak fields it never received.
        //
        //     - submit_claim(color, brand, contents, marks, where, when)
        //       inserts a row in `claims` linked to the student's most
        //       recent open lost report. The model collects verification
        //       answers from the student; the server stores them. The
        //       model never reads from the claims, profiles, found_items,
        //       or messages tables.
        //
        //   Additional server-side guards: one search per conversation,
        //   30 messages/day per user, 10 tool calls/day per user, min
        //   keyword length, stop-word rejection, 24h cooldown after a
        //   rejected claim, 14-day chat lockout on fraudulent claims.
        //   Every chat turn and tool call is persisted to chat_logs.
        // ────────────────────────────────────────────────────────────
        claudeApi = softwareSystem "Anthropic Claude API" "LLM service (Claude Haiku 4.5). Sandboxed: only two server-defined tools — search_found_items (returns boolean) and submit_claim (writes to claims table). No direct DB or filesystem access; no item data ever reaches the model." "External"

        // ────────────────────────────────────────────────────────────
        // The Lost & Found Portal system
        // ────────────────────────────────────────────────────────────
        lafSystem = softwareSystem "Lost & Found Portal" "Front door to the lost-and-found office. Students file structured reports and chat with Hawk AI which collects ownership claims; admins verify and release in person. Students never browse inventory. Real-time messaging, typing indicators, sidebar badges, and audit logging are first-class." {

            webApp = container "Web Application" "Student and admin SPA. Hosted on Vercel. Communicates with the API over HTTPS (REST) and WebSocket (real-time). Holds session token in localStorage; AuthContext + NotificationContext track user identity and per-conversation unread counts + admin Overview badge." "React 19, Vite 7, React Router 7, socket.io-client 4"

            api = container "API Application" "REST + WebSocket backend. Handles auth, business logic, uploads, real-time messaging, claim review, AI orchestration, and audit logging. Hosted on Render." "Node.js, Express 4, Socket.io 4" {

                authComponent = component "Auth Routes" "Register, login, /me. bcrypt password hash + 7-day JWT (role embedded in token)." "Express Router"

                reportsComponent = component "Reports Routes" "Lost-report CRUD + match / unmatch / resolve (transactional). Generates unique LF-XXXXXX ticket numbers (confusion-free alphabet) via crypto.randomBytes; retries on UNIQUE collision. Emits report:new to admins on submission. Tracks viewed_by_admin for the Overview sidebar badge." "Express Router + utils/ticket.js"

                foundItemsComponent = component "Found Items Routes" "Found-item CRUD. Uploads images to Supabase Storage; persists the public URL. Admin-only writes." "Express + multer"

                messagesComponent = component "Messages Routes" "Send/list messages. Admin can chat on any report; student only on own. Emits message:new on insert. Auto-messages from claim approve/reject are inserted here." "Express Router"

                claimsComponent = component "Claims Routes" "GET claims (admin), GET claim by report. PATCH approve / reject. Approve inserts a ticketed system message. Reject as fraudulent sets profiles.chat_locked_until = NOW() + 14 days." "Express Router"

                chatComponent = component "Chat Routes (Hawk AI)" "POST /api/chat. Runs the Claude Haiku 4.5 tool-use loop (max 5 iterations). Implements server-side guards: one search per conversation, min keyword length, stop-word rejection, one open claim per student, 24h cooldown after rejection. Logs every turn and tool call to chat_logs." "Express + @anthropic-ai/sdk"

                chatLimitMiddleware = component "Chat Rate-limit & Lockout" "Per-user daily counters (30 messages, 10 tool calls). Checks profiles.chat_locked_until and 403s if locked. In-memory counters keyed by user_id + UTC day." "Express middleware"

                socketServer = component "Socket.io Server" "WebSocket layer. JWT-authenticated at handshake; role re-read from DB. Users join user:{id} rooms, admins also join 'admin'. Emits message:new, report:new. Relays typing:start / typing:stop between conversation participants." "Socket.io"

                authMiddleware = component "Auth Middleware" "Verifies Bearer JWT, attaches req.user. requireAdmin gates admin-only routes." "Express middleware"

                dbPool = component "Database Pool" "PostgreSQL connection pool. SSL enforced for Supabase." "node-postgres"
            }

            db = container "Database" "PostgreSQL on Supabase. Tables: profiles (with chat_locked_until), lost_reports (with ticket_number, viewed_by_admin), found_items, messages, claims, chat_logs." "PostgreSQL 15" "Database"

            storage = container "Object Storage" "Supabase Storage. Stores found-item images in the found-items bucket; public URLs saved in DB." "Supabase Storage"
        }

        // ────────────────────────────────────────────────────────────
        // Context-level relationships
        // ────────────────────────────────────────────────────────────
        student -> lafSystem "Files lost reports (gets a ticket), chats with Hawk AI, messages admins about own cases" "HTTPS + WSS"
        admin -> lafSystem "Logs found items, reviews claims, verifies ownership in chat, matches and resolves cases" "HTTPS + WSS"
        lafSystem -> claudeApi "Sends user prompts plus two tool schemas. The model never receives item names, descriptions, locations, dates, or any PII." "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Container-level relationships
        // ────────────────────────────────────────────────────────────
        student -> webApp "Uses" "HTTPS"
        admin -> webApp "Uses" "HTTPS"

        webApp -> api "REST API calls + multipart uploads" "JSON over HTTPS"
        webApp -> api "Real-time channel: receives message:new, report:new, typing:start/stop; emits typing events while user types" "WebSocket (Socket.io)"

        api -> db "Reads from and writes to" "SQL over TCP/TLS"
        api -> storage "Uploads images and reads public URLs" "HTTPS"
        api -> claudeApi "Calls messages.create with two tool definitions. Server runs the parameterized queries when the model invokes a tool; model receives only a boolean (search) or success ack (submit_claim)." "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Component-level relationships (inside the API)
        // ────────────────────────────────────────────────────────────
        webApp -> authComponent     "POST /api/auth/{register,login} · GET /api/auth/me" "JSON / HTTPS"
        webApp -> reportsComponent  "GET / POST / PATCH /api/reports/*" "JSON / HTTPS"
        webApp -> foundItemsComponent "GET / POST /api/found-items" "JSON or multipart / HTTPS"
        webApp -> messagesComponent "GET / POST /api/messages/*" "JSON / HTTPS"
        webApp -> claimsComponent   "GET / PATCH /api/claims/*" "JSON / HTTPS"
        webApp -> chatComponent     "POST /api/chat" "JSON / HTTPS"
        webApp -> socketServer      "Opens authenticated WebSocket; emits typing events" "WS + JWT in handshake"

        authMiddleware -> authComponent       "Protects /me"
        authMiddleware -> reportsComponent    "Protects all routes; requireAdmin on match/unmatch/resolve/viewed"
        authMiddleware -> foundItemsComponent "Protects all routes; requireAdmin on writes"
        authMiddleware -> messagesComponent   "Protects all routes"
        authMiddleware -> claimsComponent     "requireAdmin on all routes (except student's own claim fetch)"
        authMiddleware -> chatComponent       "Protects POST /api/chat"

        chatLimitMiddleware -> chatComponent  "Applied before handler. Returns 403 on lockout, 429 on daily limit."

        authComponent       -> dbPool "Reads/writes profiles"
        reportsComponent    -> dbPool "Reads/writes lost_reports (+ found_items in transactions)"
        foundItemsComponent -> dbPool "Reads/writes found_items"
        messagesComponent   -> dbPool "Reads/writes messages"
        claimsComponent     -> dbPool "Reads/writes claims (+ profiles.chat_locked_until on fraud reject)"
        chatComponent       -> dbPool "Reads: existence check on found_items (boolean only). Writes: claims (via submit_claim), chat_logs (every turn)."
        chatLimitMiddleware -> dbPool "Reads profiles.chat_locked_until on each chat request"

        dbPool -> db "Runs SQL" "TCP/TLS"

        foundItemsComponent -> storage "Uploads image buffers; stores returned public URL" "HTTPS"

        reportsComponent  -> socketServer "Emits report:new to 'admin' room after a lost report is inserted"
        messagesComponent -> socketServer "Emits message:new to admin + user:{studentId} rooms after each insert"
        claimsComponent   -> messagesComponent "Inserts a ticketed system message on approve/reject (transactional)"

        chatComponent -> claudeApi "Tool-use loop. Sends conversation + two tool schemas. Receives text or tool-call requests; never grants raw query power to the model." "HTTPS / JSON"
    }

    views {

        systemContext lafSystem "SystemContext" "C1 — System Context diagram for the Lost & Found Portal." {
            include *
            autoLayout
        }

        container lafSystem "Containers" "C2 — Container diagram for the Lost & Found Portal." {
            include *
            autoLayout
        }

        component api "ApiComponents" "C3 — Component diagram for the API Application." {
            include *
            autoLayout
        }

        styles {
            element "Person" {
                shape Person
                background "#08427b"
                color "#ffffff"
            }
            element "Software System" {
                background "#1168bd"
                color "#ffffff"
            }
            element "Container" {
                background "#438dd5"
                color "#ffffff"
            }
            element "Component" {
                background "#85bbf0"
                color "#000000"
            }
            element "Database" {
                shape Cylinder
            }
            element "External" {
                background "#999999"
                color "#ffffff"
            }
        }
    }
}
