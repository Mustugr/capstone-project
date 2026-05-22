workspace "Lost & Found Portal" "C4 model for the Hunter College Lost & Found Portal capstone." {

    model {

        // ────────────────────────────────────────────────────────────
        // People
        // ────────────────────────────────────────────────────────────
        // Student: files lost reports (gets a unique LF-XXXXXX ticket),
        // chats with Hawk AI, exchanges messages with admins on own cases.
        student = person "Student" "Files lost reports and chats with Hawk AI."

        // Administrator: staff member who logs found items with photos,
        // reviews Hawk AI claims, matches reports to recovered items,
        // verifies ownership in chat, and resolves cases.
        admin = person "Administrator" "Logs found items, reviews claims, verifies in chat."

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
        claudeApi = softwareSystem "Anthropic Claude API" "Claude Haiku 4.5. Two sandboxed tools; no DB access." "External"

        // ────────────────────────────────────────────────────────────
        // The Lost & Found Portal system
        //
        // Front door to the lost-and-found office. Students file structured
        // reports and chat with Hawk AI which collects ownership claims;
        // admins verify and release in person. Students never browse
        // inventory. Real-time messaging, typing indicators, sidebar badges,
        // and audit logging are first-class.
        // ────────────────────────────────────────────────────────────
        lafSystem = softwareSystem "Lost & Found Portal" "Students file reports and chat with Hawk AI; admins verify in person." {

            // Web Application: student + admin SPA. Communicates with the API
            // over HTTPS (REST) and WebSocket (real-time). Session token in
            // localStorage; AuthContext + NotificationContext track identity
            // and per-conversation unread counts + admin Overview badge.
            webApp = container "Web Application" "Student + admin SPA on Vercel." "React 19, Vite 7, React Router 7, socket.io-client 4"

            // API Application: REST + WebSocket backend. Handles auth, business
            // logic, uploads, real-time messaging, claim review, AI orchestration,
            // and audit logging. Hosted on Render.
            api = container "API Application" "REST + WebSocket backend on Render." "Node.js, Express 4, Socket.io 4" {

                // Auth Routes: register, login, /me. bcrypt password hash + 7-day
                // JWT (role embedded in token).
                authComponent = component "Auth Routes" "Register / login / me. JWT + bcrypt." "Express Router"

                // Reports Routes: lost-report CRUD + match / unmatch / resolve
                // (transactional). Generates unique LF-XXXXXX tickets via
                // crypto.randomBytes; retries on UNIQUE collision. Emits
                // report:new to admins on submission. Tracks viewed_by_admin
                // for the Overview sidebar badge.
                reportsComponent = component "Reports Routes" "Lost-report CRUD + match / resolve. LF-XXXXXX tickets." "Express Router + utils/ticket.js"

                // Found Items Routes: found-item CRUD. Uploads images to
                // Supabase Storage; persists public URL. Admin-only writes.
                foundItemsComponent = component "Found Items Routes" "Found-item CRUD. Image upload." "Express + multer"

                // Messages Routes: send/list messages. Admin can chat on any
                // report; student only on own. Emits message:new on insert.
                // Auto-messages from claim approve/reject are inserted here.
                messagesComponent = component "Messages Routes" "Send / list messages; emits message:new." "Express Router"

                // Claims Routes: GET claims (admin), GET claim by report.
                // PATCH approve / reject. Approve inserts a ticketed system
                // message. Reject as fraudulent sets profiles.chat_locked_until
                // = NOW() + 14 days.
                claimsComponent = component "Claims Routes" "Approve / reject claims. Fraud → 14-day lockout." "Express Router"

                // Chat Routes (Hawk AI): POST /api/chat. Runs the Claude Haiku 4.5
                // tool-use loop (max 5 iterations). Server-side guards: one
                // search per conversation, min keyword length, stop-word
                // rejection, one open claim per student, 24h cooldown after
                // rejection. Logs every turn and tool call to chat_logs.
                chatComponent = component "Chat Routes (Hawk AI)" "Hawk AI tool-use loop. Server-side guards." "Express + @anthropic-ai/sdk"

                // Chat Rate-limit & Lockout: per-user daily counters (30
                // messages, 10 tool calls). Checks profiles.chat_locked_until
                // and 403s if locked. In-memory counters keyed by user_id +
                // UTC day.
                chatLimitMiddleware = component "Chat Rate-limit & Lockout" "30 msg / 10 tool per day; chat_locked_until check." "Express middleware"

                // Socket.io Server: JWT-authenticated at handshake; role
                // re-read from DB. Users join user:{id} rooms, admins also
                // join 'admin'. Emits message:new, report:new. Relays
                // typing:start / typing:stop between conversation participants.
                socketServer = component "Socket.io Server" "JWT-authenticated WebSocket; user / admin rooms." "Socket.io"

                // Auth Middleware: verifies Bearer JWT, attaches req.user.
                // requireAdmin gates admin-only routes.
                authMiddleware = component "Auth Middleware" "Verifies JWT; requireAdmin gate." "Express middleware"

                // Database Pool: PostgreSQL connection pool. SSL enforced for
                // Supabase.
                dbPool = component "Database Pool" "PostgreSQL connection pool (SSL)." "node-postgres"
            }

            // Database: PostgreSQL on Supabase. Tables: profiles (with
            // chat_locked_until), lost_reports (with ticket_number,
            // viewed_by_admin), found_items, messages, claims, chat_logs.
            db = container "Database" "Postgres on Supabase." "PostgreSQL 15" "Database"

            // Object Storage: Supabase Storage. Stores found-item images
            // in the found-items bucket; public URLs saved in DB.
            storage = container "Object Storage" "Found-item images." "Supabase Storage"
        }

        // ────────────────────────────────────────────────────────────
        // Context-level relationships
        // ────────────────────────────────────────────────────────────
        student -> lafSystem "Files reports, chats, messages admins" "HTTPS + WSS"
        admin -> lafSystem "Logs items, reviews claims, verifies in chat" "HTTPS + WSS"
        lafSystem -> claudeApi "Sends prompts + 2 tool schemas; no PII" "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Container-level relationships
        // ────────────────────────────────────────────────────────────
        student -> webApp "Uses" "HTTPS"
        admin -> webApp "Uses" "HTTPS"

        webApp -> api "REST + multipart uploads" "JSON / HTTPS"
        webApp -> api "Real-time: message:new, report:new, typing:*" "WSS / Socket.io"

        api -> db "Reads / writes" "SQL / TLS"
        api -> storage "Uploads images, reads URLs" "HTTPS"
        api -> claudeApi "messages.create with 2 tool schemas; tools run server-side" "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Component-level relationships (inside the API)
        // ────────────────────────────────────────────────────────────
        webApp -> authComponent     "POST /api/auth/* · GET /api/auth/me" "HTTPS"
        webApp -> reportsComponent  "GET / POST / PATCH /api/reports/*" "HTTPS"
        webApp -> foundItemsComponent "GET / POST /api/found-items" "HTTPS"
        webApp -> messagesComponent "GET / POST /api/messages/*" "HTTPS"
        webApp -> claimsComponent   "GET / PATCH /api/claims/*" "HTTPS"
        webApp -> chatComponent     "POST /api/chat" "HTTPS"
        webApp -> socketServer      "Authenticated WebSocket + typing" "WSS + JWT"

        authMiddleware -> authComponent       "Protects /me"
        authMiddleware -> reportsComponent    "Protects; requireAdmin on writes"
        authMiddleware -> foundItemsComponent "Protects; requireAdmin on writes"
        authMiddleware -> messagesComponent   "Protects"
        authMiddleware -> claimsComponent     "requireAdmin"
        authMiddleware -> chatComponent       "Protects POST /api/chat"

        chatLimitMiddleware -> chatComponent  "403 lockout / 429 daily"

        authComponent       -> dbPool "profiles"
        reportsComponent    -> dbPool "lost_reports"
        foundItemsComponent -> dbPool "found_items"
        messagesComponent   -> dbPool "messages"
        claimsComponent     -> dbPool "claims + chat_locked_until"
        chatComponent       -> dbPool "boolean check + writes claims / chat_logs"
        chatLimitMiddleware -> dbPool "reads chat_locked_until"

        dbPool -> db "Runs SQL" "TCP/TLS"

        foundItemsComponent -> storage "Uploads images" "HTTPS"

        reportsComponent  -> socketServer "Emits report:new to admin room"
        messagesComponent -> socketServer "Emits message:new"
        claimsComponent   -> messagesComponent "Inserts system message on approve / reject"

        chatComponent -> claudeApi "Tool-use loop; model never gets raw query power" "HTTPS / JSON"
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
