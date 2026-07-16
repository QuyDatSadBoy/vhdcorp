# AGENT_PLAN.md — VHD Corp AI Chat Agent

> Kế hoạch chi tiết cho AI chat agent: service Python (FastAPI + LangGraph) + widget chat trên Next.js.
> Nghiên cứu thư viện qua Context7 (CopilotKit, LangGraph, AG-UI) ngày 2026-07-10.

---

## 1. Mục tiêu

Trợ lý AI cho khách truy cập website VHD Corp:

- **Hỏi đáp sản phẩm** từ dữ liệu JSON (catalog xuất từ DB).
- **Chủ động gửi liên hệ** thay khách (tạo contact → inbox admin + email).
- **Tìm kiếm web** khi cần thông tin ngoài catalog (Tavily).
- **Quản lý hội thoại** như ChatGPT: danh sách, lịch sử, đổi tên, xóa; chỉ tạo hội thoại khi có tin nhắn đầu tiên.
- Trả lời tiếng Việt, đúng brand, an toàn (guardrails).

## 2. Kiến trúc tổng thể

```text
┌──────────────┐   SSE stream (token/tool events)   ┌───────────────────────┐
│ Next.js FE   │ ──────────────────────────────────▶ │ Agent Service (8001)  │
│ Chat Widget  │   REST /conversations CRUD          │ FastAPI + LangGraph   │
└──────────────┘                                     │  • Gemini 3 Flash     │
       │                                             │  • SQLite (chat.db)   │
       │ trang web hiện tại                          │  • checkpoints.sqlite │
       ▼                                             └──────────┬────────────┘
┌──────────────┐        POST /api/contact                       │ tools
│ NestJS BE    │ ◀──────────────────────────────────────────────┘
│ (8080)       │ → lưu DB + gửi email admin + email khách (nodemailer)
└──────────────┘
```

- **Model**: `gemini-3-flash-preview` (đã verify key hoạt động) qua `langchain-google-genai`.
- **Giao thức chat**: SSE (Server-Sent Events) trực tiếp FastAPI → browser. Sự kiện chuẩn hóa theo tinh thần AG-UI (`message.delta`, `tool.start`, `tool.end`, `done`, `error`) — đơn giản, không phụ thuộc version CopilotKit runtime (CopilotKit LangGraphAgent yêu cầu LangGraph Platform server riêng, xung đột với yêu cầu FastAPI tự quản; xem §7).

## 3. Service Python — cấu trúc thư mục (base class + kế thừa)

```text
agent/
├── pyproject.toml            # uv/pip, Python 3.13
├── .env / .env.example       # GOOGLE_API_KEY, TAVILY_API_KEYS, AGENT_MODEL, BE_API_URL, CORS
├── data/products.json        # catalog xuất từ DB (script sync kèm theo)
├── app/
│   ├── main.py               # FastAPI app factory, CORS, lifespan (mở/đóng SQLite)
│   ├── core/
│   │   ├── config.py         # pydantic-settings
│   │   └── logging.py
│   ├── db/
│   │   ├── database.py       # aiosqlite: conversations, messages, memory
│   │   └── repository.py     # ConversationRepo, MessageRepo, MemoryRepo
│   ├── guardrails/
│   │   ├── base.py           # BaseGuardrail(ABC): .check(text) -> GuardrailResult
│   │   ├── length.py         # giới hạn độ dài input
│   │   ├── injection.py      # pattern prompt-injection / system-override
│   │   └── pipeline.py       # GuardrailPipeline chạy tuần tự các guardrail
│   ├── memory/
│   │   ├── base.py           # BaseMemory(ABC): load(), save()
│   │   ├── short_term.py     # N message gần nhất (mặc định 8)
│   │   ├── summary.py        # tóm tắt phần cũ — chạy BACKGROUND sau mỗi lượt
│   │   └── long_term.py      # facts về khách (tên, nhu cầu, SĐT...) — background extract
│   ├── tools/
│   │   ├── base.py           # helper build tool + error wrapping
│   │   ├── products.py       # search_products / get_product_detail (JSON, fuzzy VN)
│   │   ├── web_search.py     # Tavily + xoay vòng key khi rate-limit
│   │   └── contact.py        # send_contact_request → BE POST /api/contact
│   ├── graph/
│   │   ├── base.py           # BaseNode(ABC): tên node + run(state); BaseGraphBuilder
│   │   ├── state.py          # AgentState (TypedDict: messages, summary, facts, guardrail)
│   │   ├── nodes/
│   │   │   ├── guardrail_node.py   # chặn input xấu → trả lời từ chối lịch sự
│   │   │   ├── context_node.py     # nạp summary + long-term facts vào system prompt
│   │   │   ├── agent_node.py       # gọi Gemini (bind tools)
│   │   │   └── tool_node.py        # thực thi tool calls
│   │   └── builder.py        # ChatGraphBuilder(BaseGraphBuilder) → compile với AsyncSqliteSaver
│   ├── services/
│   │   ├── chat_service.py   # orchestration: stream, tạo conversation ở message đầu,
│   │   │                     #   auto-title, kích hoạt background memory task
│   │   └── memory_service.py # summarize + extract facts (Gemini, chạy nền)
│   └── api/
│       ├── chat.py           # POST /api/chat (SSE)
│       ├── conversations.py  # GET/PATCH/DELETE /api/conversations[...]
│       └── health.py         # GET /api/health
└── tests/                    # pytest + httpx: guardrail, memory, tools, API e2e
```

### Luồng graph (LangGraph `StateGraph`)

```
START → guardrail → (bị chặn? → END trả lời từ chối)
              ↓ ok
          context (inject summary + facts + persona VHD)
              ↓
           agent (Gemini 3 Flash + tools)  ⇄  tools (products/web/contact)
              ↓ (không còn tool call)
             END → background: summarize + extract facts
```

- **Checkpoint**: `AsyncSqliteSaver` (`langgraph-checkpoint-sqlite`) — `thread_id` = conversation id → resume đủ trạng thái.
- **Short-term memory**: chỉ đưa N=8 message cuối vào prompt; phần cũ được thay bằng `summary`.
- **Summary + long-term**: sau mỗi lượt trả lời, task nền (asyncio) tóm tắt hội thoại cũ và trích facts (tên khách, nhu cầu, SĐT/email nếu khách cung cấp) vào bảng `memory` — lượt sau `context_node` nạp lại.
- **Guardrails**: pipeline chạy trước graph chính; chặn: input rỗng/quá dài (>2000 ký tự), pattern injection ("ignore previous instructions", lộ system prompt...), spam lặp ký tự.
- **Auto-title**: sau message đầu, đặt tên hội thoại từ nội dung (Gemini, task nền).
- **Tavily key rotation**: nhận list key qua env; khi 429/432 → chuyển key kế tiếp.

### API contract (FE dùng)

| Method | Path                               | Mô tả                                                                                                                                                                                                       |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/chat`                        | body `{message, conversation_id?}` — nếu thiếu id → **tạo hội thoại mới** (đúng yêu cầu "chỉ tạo khi chat message đầu"). SSE: `conversation` (id+title), `message.delta`, `tool.start/end`, `done`, `error` |
| GET    | `/api/conversations`               | list `{id, title, updated_at, message_count}`                                                                                                                                                               |
| GET    | `/api/conversations/{id}/messages` | lịch sử đầy đủ                                                                                                                                                                                              |
| PATCH  | `/api/conversations/{id}`          | đổi tên                                                                                                                                                                                                     |
| DELETE | `/api/conversations/{id}`          | xóa (kèm checkpoint)                                                                                                                                                                                        |
| GET    | `/api/health`                      | health + model + số sản phẩm đã nạp                                                                                                                                                                         |

Định danh khách: cookie `vhd_chat_uid` (uuid, FE tự sinh) → mỗi khách chỉ thấy hội thoại của mình.

## 4. Backend NestJS — Email (nodemailer)

- `MailService` (be/src/services/mail/): nodemailer, cấu hình SMTP qua env (`SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM`, `ADMIN_EMAIL`).
- Khi khách gửi form liên hệ (`POST /api/contact`):
  1. Lưu DB (đã có).
  2. **Email cho admin** (ADMIN_EMAIL): nội dung liên hệ + link inbox admin.
  3. **Email xác nhận cho khách**: cảm ơn + tóm tắt yêu cầu + hotline/brand.
  - Gửi **fire-and-forget** (không chặn response, lỗi mail chỉ log).
- Chưa có SMTP thật → tự động dùng **JSON transport** (log email ra console + đánh dấu `[MAIL:DRY-RUN]`) — flow vẫn test được end-to-end. Khi có SMTP thật chỉ cần điền env (hướng dẫn §8).

## 5. FE — Chat Widget (Next.js)

- **Nút chat nổi** góc phải dưới (đồng bộ brand: gradient primary→accent, logo mark) — mở **panel chat** (desktop: 420×640 popup; mobile: full-screen).
- Tính năng như ChatGPT:
  - Sidebar hội thoại (danh sách + thời gian), **New chat** (chỉ thực sự tạo khi gửi message đầu), đổi tên (inline), xóa (confirm).
  - Streaming từng token, markdown (bảng/giá sản phẩm), chỉ báo "đang gọi công cụ…" khi agent dùng tool, suggested prompts khi hội thoại trống, auto-scroll, trạng thái lỗi + retry.
  - Card sản phẩm đẹp khi agent trả về sản phẩm (tên + giá + link) — AI "tương tác với UI".
- **Thư viện**: đã đánh giá CopilotKit/AG-UI/A2UI qua Context7 — peer-deps CopilotKit 1.62 hỗ trợ React 19 OK, nhưng `@copilotkit/runtime` LangGraphAgent yêu cầu chạy LangGraph Platform server riêng (port 8123) + thêm 1 lớp Node runtime giữa FE và FastAPI; với yêu cầu FastAPI tự quản toàn bộ (guardrails/memory/conversations), widget dùng **SSE trực tiếp + UI custom** theo pattern sự kiện AG-UI. Ưu điểm: ổn định production, kiểm soát 100% UI/brand, không khóa version. (Nếu sau này muốn CopilotKit: BE đã tách service layer, chỉ cần thêm endpoint ag-ui.)
- Vị trí code: `fe/components/chat/` (+ `fe/services/chat-agent.service.ts`, types) — thay `FloatingContact` bằng widget mới có cả kênh liên hệ cũ.

## 6. Test plan (3 vòng liên tiếp 100%)

Mỗi vòng:

1. **Script**: health các service (BE 8080, FE 3001, Agent 8001); pytest agent (guardrail, memory, tools, conversation API); contact→email dry-run log; ma trận route cũ.
2. **Agent API**: tạo hội thoại bằng message đầu → hỏi giá sản phẩm (đúng số liệu từ JSON) → hỏi tiếp (context giữ) → rename → list → history → delete; guardrail chặn injection; tool contact tạo được contact trong DB BE.
3. **Browser (như người thật)**: mở widget, gửi chat, xem streaming, đổi tên/xóa hội thoại, kiểm tra card sản phẩm, mobile 390px, console 0 lỗi.

## 7. Ghi chú Context7

- `/copilotkit/with-langgraph-python`: mẫu chính thức dùng `LangGraphAgent({deploymentUrl: ...:8123})` → cần `langgraph dev`/Platform, không phải FastAPI thuần → không khớp yêu cầu.
- LangGraph 1.x: `StateGraph` + `AsyncSqliteSaver` (package `langgraph-checkpoint-sqlite`) là cách persist chuẩn cho SQLite.
- AG-UI event naming được mượn cho SSE schema để sau này nâng cấp dễ.

## 8. Cần bạn cung cấp sau (không chặn dev/test)

| Mục        | Cần gì                                                                                | Lấy ở đâu                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Email thật | `SMTP_HOST/PORT/USER/PASS` (khuyên dùng Gmail App Password hoặc Resend/Brevo SMTP)    | Gmail: Google Account → Security → 2-Step Verification → App passwords. Điền vào `be/.env`, đặt `ADMIN_EMAIL` = mail nhận thông báo |
| Cloudinary | ĐÃ HOẠT ĐỘNG (đã test upload/delete thật lên cloud `vhdcorp`)                         | —                                                                                                                                   |
| Gemini     | ĐÃ HOẠT ĐỘNG (`gemini-3-flash-preview`)                                               | Nâng quota nếu cần tại aistudio.google.com                                                                                          |
| Tavily     | 13 key dev đã verify — dùng xoay vòng                                                 | —                                                                                                                                   |
| Email SMTP | ĐÃ GẮN THẬT (Gmail vhdcorp.contact@gmail.com, App Password) — email đã gửi thành công | —                                                                                                                                   |
| LangSmith  | ĐÃ GẮN (`vhdcorp-agent` project) tracing                                              | —                                                                                                                                   |
| MiniMax    | ĐÃ VERIFY (TTS speech-02-turbo) — dùng cho voice reply                                | —                                                                                                                                   |

---

## 9. NÂNG CAO (2026-07-10) — Gen-UI, Voice, Image, A2A, MCP

### 9.1 Quyết định kiến trúc CopilotKit

CopilotKit runtime chính thức yêu cầu LangGraph Platform server (port 8123) quản state — sẽ mất toàn bộ conversation-management + guardrails + memory custom đã test. Vì vậy giữ **FastAPI + SSE tự quản** và tự implement **generative-UI pattern giống CopilotKit** (agent quyết định render component React) — kiểm soát brand 100%, ổn định trên Next 16/React 19, không khóa version. Trải nghiệm tương đương các demo CopilotKit.

### 9.2 Generative UI — contract (BE emit ⇄ FE render)

Agent có các tool "render" → khi gọi, BE emit SSE event:

```
data: {"type":"ui","component":"<name>","props":{...}}
```

FE widget render component tương ứng inline trong luồng chat:
| component | props | dùng khi |
|---|---|---|
| `product-carousel` | `{products:[{name,price,image,slug,stock,category}]}` | khách hỏi/duyệt sản phẩm |
| `contact-form` | `{prefill?:{name,email,phone,message}}` | khách muốn để lại liên hệ |
| `quote-request` | `{product?,products:[...]}` | khách cần báo giá số lượng |
| `comparison-table` | `{headers:[],rows:[{label,values,highlight?}]}` | so sánh sản phẩm |
| `faq` | `{items:[{question,answer}]}` | câu hỏi thường gặp |
| `image-search-result` | `{query,products:[...]}` | sau khi tìm bằng ảnh |

Form gen-UI submit → gọi lại agent (tool `send_contact_request`/`create_quote`) → BE lưu DB + email → trả xác nhận. Đây là HITL (human-in-the-loop) đúng tinh thần CopilotKit.

### 9.3 Voice

- **Voice-to-text (input)**: Web Speech API `SpeechRecognition` (native, `lang="vi-VN"`, không tốn key) — nút mic trong chat-input, transcript đổ thẳng vào ô nhập.
- **Voice reply (output, tùy chọn)**: nút loa trên bubble assistant → gọi `POST /api/tts` (BE proxy MiniMax `speech-02-turbo`, voice tiếng Việt) → phát audio. Proxy ẩn key MiniMax khỏi FE.

### 9.4 Image search (tải ảnh tìm sản phẩm)

- Nút đính ảnh trong chat-input → gửi `POST /api/chat` kèm `image` (base64).
- Agent node dùng **Gemini vision** (`gemini-3-flash-preview` đa phương thức) mô tả ảnh → map sang catalog (`search_products`) → emit `product-carousel`. Trả lời "Mình thấy ảnh giống các sản phẩm sau…".

### 9.5 A2A (Agent-to-Agent)

- Expose **Agent Card** tại `/.well-known/agent-card.json` (chuẩn A2A) + endpoint `POST /a2a` (JSON-RPC `message/send`) để agent/hệ thống khác gọi trợ lý VHD như một skill (hỏi giá, tạo liên hệ). Chứng minh khả năng liên thông đa-agent.

### 9.6 MCP (Model Context Protocol)

- Expose **MCP server** (`/mcp`, streamable-http) publish tools catalog: `search_products`, `get_product`, `create_contact` — để Claude Desktop / IDE / agent khác dùng trực tiếp catalog VHD. Dùng `mcp` (FastMCP) mount vào FastAPI.

### 9.7 LangSmith

Bật tracing (`LANGSMITH_TRACING=true`, project `vhdcorp-agent`) → mọi lượt chat được trace để debug/observability.

---

## 10. BỔ SUNG (2026-07-10) — Sync catalog, Knowledge base, Đọc Gmail

### 10.1 Đồng bộ products.json 100% với DB

- `app/services/product_sync.py`: `sync_products(be_api_url, output_path)` fetch `GET /products?pageSize=100`, lọc CHỈ `status == PUBLISHED`, map đầy đủ field (`id, slug, name, price` (int VND), `stock, description` (strip HTML), `category{name,slug}, images` (mảng) + `image` (ảnh đầu), `status, url`) → ghi đè `data/products.json`.
- **Startup** (`app/main.py` lifespan): tự đồng bộ TRƯỚC khi `load_catalog`; BE lỗi/không chạy → log cảnh báo + fallback file JSON hiện có (KHÔNG crash).
- **Endpoint** `POST /api/admin/resync-products` (header `X-Resync-Secret` == `RESYNC_SECRET`, mặc định `vhdcorp-resync`) → fetch lại + ghi file + `load_catalog(force=True)` + reload knowledge → trả `{count}`. Dùng cho admin/cron khi sản phẩm đổi mà không cần restart.
- `scripts/sync_products.py` dùng lại service (nguồn chân lý duy nhất).

### 10.2 Knowledge base (thông tin ngoài sản phẩm)

- `data/knowledge.md`: nội dung mẫu tiếng Việt có heading `##` (giới thiệu, giờ mở cửa `8:00–17:30 T2–T7`, địa chỉ/showroom, giao hàng, thanh toán B2B/B2C, đổi trả/bảo hành, lĩnh vực, FAQ, cam kết ISO). Khách chỉ cần sửa nội dung dưới các heading (có ghi chú `<!-- Khách điền/sửa... -->`).
- `app/services/knowledge.py`: nạp lúc startup + reload khi resync; `get_context_text()` nhồi TOÀN BỘ knowledge (bỏ comment) vào system prompt (`context_node`); `search_knowledge_text(query)` tra section liên quan.
- Tool `search_knowledge(query)` (`app/tools/knowledge.py`) cho agent tra cứu; persona cập nhật để agent biết dùng knowledge cho câu hỏi công ty/chính sách/giờ mở cửa.

### 10.3 Đọc Gmail (IMAP) — chỉ admin

- `app/services/gmail_reader.py`: stdlib `imaplib` + `email`. `GmailReader` là context manager (IMAPS 993, login, `SELECT INBOX readonly`, `BODY.PEEK` để KHÔNG đánh dấu đã đọc, đóng sạch). `list_recent_emails(limit, unread_only)` → list `{from, subject, date, snippet(≤200), unread}`. Lỗi kết nối/login → `GmailReaderError` (không crash).
- Endpoint `GET /api/admin/emails?limit=&unread_only=` (header `X-Admin-Secret` == `ADMIN_SECRET`, mặc định `vhdcorp-admin`). BLOCKING nên chạy qua `run_in_threadpool`. **KHÔNG** expose cho chat công khai (bảo mật).

### 10.4 Env cần thêm (`.env` / `.env.example`)

```
RESYNC_SECRET=vhdcorp-resync
ADMIN_SECRET=vhdcorp-admin
GMAIL_IMAP_USER=vhdcorp.contact@gmail.com
GMAIL_IMAP_PASSWORD=<app-password-16-ký-tự>
GMAIL_IMAP_HOST=imap.gmail.com
```

## 11. BỔ SUNG (2026-07-10, đợt 2) — Real-time catalog, persist gen-UI, TTS cache, Knowledge admin UI

### 11.1 Catalog real-time 100% (admin sửa → chat thấy ngay)

- **Push webhook (chính)**: BE `AgentService.notifyProductsChanged()` (`be/src/services/agent/`) fire-and-forget `POST /api/admin/resync-products` sau MỌI mutation product (create/update/softDelete/restore) + category (create/update/delete). Đo thực tế: **0.25s** từ lúc admin bấm lưu đến khi agent thấy giá mới.
- **Auto-sync 30s (lưới an toàn)**: task nền trong lifespan (`_periodic_product_sync`) đồng bộ mỗi 30s — bắt trường hợp sửa DB trực tiếp/webhook lỗi mạng. BE offline → log debug, không chết vòng lặp.
- Env BE cần thêm: `AGENT_URL`, `AGENT_RESYNC_SECRET`, `AGENT_ADMIN_SECRET` (xem `be/.env.example`).

### 11.2 Persist gen-UI (reload không mất carousel/form)

- Cột `messages.ui_blocks` (TEXT JSON, migration tự động qua `PRAGMA table_info` trong `database.py connect()`).
- `chat_service.stream_chat` gom mọi event `ui` đã emit (kể cả `image-search-result`) → lưu kèm message assistant; `GET /api/conversations/{id}/messages` trả `ui_blocks` → FE `use-chat.ts` map thành `uiBlocks` khi nạp lịch sử.

### 11.3 TTS nhanh (`app/api/tts.py` + `fe/components/chat/tts-button.tsx`)

- Server: `httpx.AsyncClient` dùng chung (bỏ TLS handshake mỗi request) + LRU cache 64 MP3 theo sha256(text) — header `X-TTS-Cache: hit|miss`. Đo: miss 3.1s → hit 0.001s.
- Client: cache Blob theo text (Map, max 24) — bấm nghe lại phát sau ~60ms thay vì gọi mạng.

### 11.4 UX widget chat (fix 2026-07-10, đợt 3)

- **Con lăn chuột chỉ cuộn trong panel**: site dùng **Lenis** smooth-scroll (hijack wheel ở tầng window, bỏ qua `preventDefault` của handler khác) → panel gắn `data-lenis-prevent` (Lenis bỏ qua event bắt nguồn trong panel) + wheel listener `passive:false` trên panel: luôn `preventDefault` rồi tự `scrollTop += deltaY` cho scroller gần nhất bên trong (message list/sidebar/textarea). Trang phía sau tuyệt đối không cuộn; ngoài panel cuộn bình thường.
- **Upload ảnh chat**: bỏ giới hạn cứng 4MB (ảnh điện thoại thường 3–8MB → trước đây bị từ chối). Ảnh được **thu nhỏ client-side** về ≤1280px + nén JPEG 0.85 (`createImageBitmap` + canvas) trước khi gửi → payload nhẹ, Gemini vision đủ dùng; chặn >15MB; reset `input.value` để chọn lại cùng file vẫn nhận; định dạng không decode được (HEIC…) báo lỗi rõ.

### 11.5 Knowledge sửa từ admin (WYSIWYG)

- Agent: `GET/PUT /api/admin/knowledge` (X-Admin-Secret) — ghi `data/knowledge.md` + `load_knowledge(force=True)` → áp dụng ngay không restart.
- BE proxy: `GET/PUT /api/agent/knowledge` (JWT ADMIN/STAFF, `AgentController`) — secret chỉ nằm ở BE. Body dùng field `markdown` (tránh `SanitizeHtmlInterceptor` encode markdown như field `content`).
- FE: trang `/admin/knowledge` ("Kiến thức AI" trong sidebar) — Tiptap WYSIWYG (marked: md→html, turndown: html→md) + chế độ "Markdown thô" giữ nguyên 100% định dạng (kể cả comment hướng dẫn `<!-- -->`; chế độ trực quan sẽ lược comment).

## Cập nhật 2026-07-15 — Đọc DB trực tiếp + phủ đủ module web

- **`app/db/catalog.py`**: pool asyncpg read-only tới PostgreSQL của BE (`CATALOG_DATABASE_URL`). Hàm: `fetch_products` / `fetch_posts` / `fetch_categories` / `fetch_recommendations` (co-view từ `view_events`, fallback cùng danh mục) / `fetch_company_info` (site config PUBLISHED). Lỗi DB → trả rỗng để tool fallback, không vỡ chat.
- **`app/tools/products.py`**: `load_catalog_live()` — mỗi lượt tool đọc DB trực tiếp, cập nhật cache module; DB lỗi dùng `data/products.json` (webhook BE vẫn đồng bộ file này ~0.25s). `search_products`/`get_product_detail` chuyển sang async.
- **`app/tools/site.py`** (mới): `search_posts` (push gen-UI `post-list`), `list_categories` (push `category-list`), `get_recommendations` (push `product-carousel`), `get_company_info` (text từ config). Đăng ký trong `graph/builder.py` — tổng 15 tools; persona (`context_node.py`) dạy model cách dùng.
- **FE gen-UI mới**: `post-list.tsx`, `category-list.tsx` — đăng ký tại `gen-ui/gen-ui-block.tsx`.
- Test: `tests/test_tools.py` dùng `ainvoke` (tool async); toàn suite 57/57 PASS.
