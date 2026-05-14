workspace "Lost & Found Portal" "Architectural C4 model for the Hunter College Lost & Found Portal capstone project — a full-stack web application that lets students report lost items, lets admins manage found items, supports real-time messaging between students and admins, and provides an AI assistant (Hawk AI) that searches the database conversationally." {

    model {

        // ────────────────────────────────────────────────────────────
        // People
        // ────────────────────────────────────────────────────────────
        student = person "Student" "A Hunter College student who has lost an item. Files lost-item reports, messages admin staff, and queries the Hawk AI assistant to search the database."

        admin = person "Administrator" "Staff member responsible for the lost-and-found inventory. Adds found items, matches lost reports to recovered items, replies to student messages, and marks cases as resolved."

        // ────────────────────────────────────────────────────────────
        // External systems
        //
        // Security note on the Claude API integration:
        //   The model has NO direct database access. It can only invoke
        //   a single server-defined function (search_found_items) whose
        //   only effect is a parameterized read-only query against the
        //   found_items table filtered to status='Unclaimed'. The
        //   profiles, lost_reports, and messages tables are not exposed
        //   to the model under any circumstance.
        // ────────────────────────────────────────────────────────────
        claudeApi = softwareSystem "Anthropic Claude API" "LLM service (Claude Haiku 4.5). Sandboxed: can only invoke the server-defined search_found_items tool. No direct DB or filesystem access." "External"

        // ────────────────────────────────────────────────────────────
        // The Lost & Found Portal system
        // ────────────────────────────────────────────────────────────
        lafSystem = softwareSystem "Lost & Found Portal" "Student-side: lets students file lost-item reports and exchange messages with administrators. Admin-side: lets administrators manage the found-items inventory, match reports to recovered items, and resolve cases. Includes Hawk AI, an AI assistant that lets students search by description (admin verifies ownership before any pickup; students never browse the inventory directly)." {

            webApp = container "Web Application" "Student and admin SPA. Hosted on Vercel. Communicates with the API over HTTPS (REST) and WebSocket (real-time)." "React 18, Vite, React Router, socket.io-client"

            api = container "API Application" "REST + WebSocket backend. Handles auth, business logic, uploads, real-time messaging, and AI orchestration. Hosted on Render." "Node.js, Express, Socket.io" {

                authComponent = component "Auth Routes" "Register, login, /me. bcrypt + 7-day JWT." "Express Router"

                reportsComponent = component "Reports Routes" "Lost-report CRUD + match / unmatch / resolve (transactional)." "Express Router"

                foundItemsComponent = component "Found Items Routes" "Found-item CRUD. Uploads images to Supabase Storage and persists the public URL." "Express + multer"

                messagesComponent = component "Messages Routes" "Send/list messages. After insert, emits a Socket.io message:new event." "Express Router"

                chatComponent = component "Chat Routes" "Hawk AI endpoint. Security boundary between Claude and the DB. storage_location is withheld; system prompt enforces verification-first workflow and admin-only pickup." "Express + @anthropic-ai/sdk"

                socketServer = component "Socket.io Server" "WebSocket layer. JWT-authenticated; users join user:{id} rooms, admins also join the admin room." "Socket.io"

                authMiddleware = component "Auth Middleware" "Verifies Bearer JWT, attaches req.user. requireAdmin gates admin-only routes." "Express middleware"

                dbPool = component "Database Pool" "Postgres connection pool. SSL enforced for Supabase." "node-postgres"
            }

            db = container "Database" "Postgres on Supabase. Tables: profiles, lost_reports, found_items, messages." "PostgreSQL 15" "Database"

            storage = container "Object Storage" "Supabase Storage. Stores found-item images in the found-items bucket; URLs saved in DB." "Supabase Storage"
        }

        // ────────────────────────────────────────────────────────────
        // Context-level relationships
        // ────────────────────────────────────────────────────────────
        student -> lafSystem "Files lost-item reports, messages admin, queries Hawk AI" "HTTPS"
        admin -> lafSystem "Adds found items, matches reports, replies to students, resolves cases" "HTTPS"
        lafSystem -> claudeApi "Sends user prompts plus a single tool schema (search_found_items). No SQL, no user data, no PII leaves the system." "HTTPS / JSON"

        // ────────────────────────────────────────────────────────────
        // Container-level relationships
        // ────────────────────────────────────────────────────────────
        student -> webApp "Uses" "HTTPS"
        admin -> webApp "Uses" "HTTPS"

        webApp -> api "Makes REST API calls" "JSON over HTTPS"
        webApp -> api "Receives real-time message events" "WebSocket (Socket.io)"

        api -> db "Reads from and writes to" "SQL over TCP/TLS"
        api -> storage "Uploads images and reads public URLs" "HTTPS"
        api -> claudeApi "Calls messages.create with a single tool definition; the model invokes search_found_items, the API runs the parameterized query and returns rows back to the model" "HTTPS / JSON"

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
        chatComponent -> dbPool "Reads unclaimed found_items ONLY (parameterized SELECT executed by server when Claude calls the tool; Claude never composes the SQL itself)"

        dbPool -> db "Runs SQL" "TCP/TLS"
        foundItemsComponent -> storage "Uploads image buffers, retrieves public URL" "HTTPS"
        messagesComponent -> socketServer "Emits message:new events after insert"
        chatComponent -> claudeApi "Tool-use loop. Sends conversation + tool schema. Receives text replies or tool-call requests; never grants raw query power to the model." "HTTPS / JSON"
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
