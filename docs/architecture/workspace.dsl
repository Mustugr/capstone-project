workspace "Lost & Found Portal" "Architectural C4 model for the Hunter College Lost & Found Portal capstone project — a full-stack web application that lets students report lost items, lets admins manage found items, supports real-time messaging between students and admins, and provides an AI assistant (Hawk AI) that searches the database conversationally." {

    model {

        // ────────────────────────────────────────────────────────────
        // People
        // ────────────────────────────────────────────────────────────
        student = person "Student" "A Hunter College student who has lost an item. Files lost-item reports, browses found items, messages admin staff, and queries the Hawk AI assistant to search the database."

        admin = person "Administrator" "Staff member responsible for the lost-and-found inventory. Adds found items, matches lost reports to recovered items, replies to student messages, and marks cases as resolved."

        // ────────────────────────────────────────────────────────────
        // External systems
        // ────────────────────────────────────────────────────────────
        claudeApi = softwareSystem "Anthropic Claude API" "Hosted large language model service (Claude Haiku 4.5). Used by the Hawk AI feature via the Messages API with tool use." "External"

        // ────────────────────────────────────────────────────────────
        // The Lost & Found Portal system
        // ────────────────────────────────────────────────────────────
        lafSystem = softwareSystem "Lost & Found Portal" "Tracks lost reports and found items, supports matching workflows, provides real-time messaging between students and admins, and offers an AI-powered search assistant." {

            webApp = container "Web Application" "Single-page application providing the student and admin user interfaces. Built with Vite and React; hosted on Vercel. Talks to the API over HTTPS for REST calls and over WebSocket for real-time message delivery." "React 18, Vite, React Router, socket.io-client"

            api = container "API Application" "REST and WebSocket backend. Handles authentication, business logic, image uploads, real-time message broadcasting, and the AI tool-use orchestration. Hosted on Render." "Node.js, Express, Socket.io, @anthropic-ai/sdk, @supabase/supabase-js" {

                authComponent = component "Auth Routes" "Registration, login, /me. Hashes passwords with bcrypt (10 rounds) and issues 7-day JWTs signed with JWT_SECRET." "Express Router (routes/auth.js)"

                reportsComponent = component "Reports Routes" "CRUD for lost reports plus match / unmatch / resolve workflows. Match and resolve run as transactions that update both lost_reports and found_items consistently." "Express Router (routes/reports.js)"

                foundItemsComponent = component "Found Items Routes" "CRUD for found items. Accepts multipart uploads (multer memory storage), pushes the buffer to Supabase Storage, and persists the returned public URL." "Express Router + multer (routes/foundItems.js)"

                messagesComponent = component "Messages Routes" "Send and list messages tied to a lost report. After insert, emits a message:new Socket.io event to the admin room and to the owning student's private room for real-time delivery." "Express Router (routes/messages.js)"

                chatComponent = component "Chat Routes" "Hawk AI endpoint. Sends the conversation to the Claude API with a search_found_items tool definition, runs the tool-use loop (max 5 iterations), executes search queries against the database when Claude requests them, and returns the model's final reply." "Express Router + @anthropic-ai/sdk (routes/chat.js)"

                socketServer = component "Socket.io Server" "WebSocket layer attached to the HTTP server. Authenticates connections by JWT in the handshake; each user joins a private room named user:{id}, and admins also join the shared admin room." "Socket.io (in index.js)"

                authMiddleware = component "Auth Middleware" "Verifies the Bearer JWT, attaches req.user, and rejects expired or invalid tokens. requireAdmin further gates admin-only endpoints." "Express middleware (middleware/auth.js)"

                dbPool = component "Database Pool" "PostgreSQL connection pool. Selects between local Postgres and Supabase based on the DB_TARGET environment variable; enforces SSL for Supabase connections." "node-postgres (pg) (db.js)"
            }

            db = container "Database" "Persists the four core tables: profiles, lost_reports, found_items, and messages. Includes foreign-key relationships and status enums." "PostgreSQL 15 (Supabase)" "Database"

            storage = container "Object Storage" "Stores uploaded found-item images in the found-items bucket as public objects. Public URLs are written back to the found_items.image_url column." "Supabase Storage"
        }

        // ────────────────────────────────────────────────────────────
        // Context-level relationships
        // ────────────────────────────────────────────────────────────
        student -> lafSystem "Files lost-item reports, browses found items, messages admin, queries Hawk AI" "HTTPS"
        admin -> lafSystem "Adds found items, matches reports, replies to students, resolves cases" "HTTPS"
        lafSystem -> claudeApi "Sends user prompts plus tool definitions; exchanges tool-use turns" "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Container-level relationships
        // ────────────────────────────────────────────────────────────
        student -> webApp "Uses" "HTTPS"
        admin -> webApp "Uses" "HTTPS"

        webApp -> api "Makes REST API calls" "JSON over HTTPS"
        webApp -> api "Receives real-time message events" "WebSocket (Socket.io)"

        api -> db "Reads from and writes to" "SQL over TCP/TLS"
        api -> storage "Uploads images and reads public URLs" "HTTPS"
        api -> claudeApi "Calls messages.create with tool definitions" "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Component-level relationships (inside the API)
        // ────────────────────────────────────────────────────────────
        webApp -> authComponent "POST /api/auth/{register,login,me}" "JSON / HTTPS"
        webApp -> reportsComponent "GET / POST / PATCH /api/reports/*" "JSON / HTTPS"
        webApp -> foundItemsComponent "GET / POST /api/found-items" "JSON or multipart / HTTPS"
        webApp -> messagesComponent "GET / POST /api/messages/*" "JSON / HTTPS"
        webApp -> chatComponent "POST /api/chat" "JSON / HTTPS"
        webApp -> socketServer "Opens authenticated WebSocket" "WS + JWT in handshake"

        authMiddleware -> authComponent "Protects /me"
        authMiddleware -> reportsComponent "Protects all routes"
        authMiddleware -> foundItemsComponent "Protects all routes"
        authMiddleware -> messagesComponent "Protects all routes"
        authMiddleware -> chatComponent "Protects POST /api/chat"

        authComponent -> dbPool "Reads/writes profiles"
        reportsComponent -> dbPool "Reads/writes lost_reports and found_items"
        foundItemsComponent -> dbPool "Reads/writes found_items"
        messagesComponent -> dbPool "Reads/writes messages"
        chatComponent -> dbPool "Reads found_items (via tool call)"

        dbPool -> db "Runs SQL" "TCP/TLS"
        foundItemsComponent -> storage "Uploads image buffers, retrieves public URL" "HTTPS"
        messagesComponent -> socketServer "Emits message:new events after insert"
        chatComponent -> claudeApi "Tool-use loop with search_found_items" "HTTPS / JSON"
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
