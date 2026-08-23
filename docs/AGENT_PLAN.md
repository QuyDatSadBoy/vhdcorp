# AGENT_PLAN.md — VHD Corp AI Chat Agent

> Kế hoạch chi tiết cho AI chat agent: service Python (FastAPI + LangGraph) + widget chat trên Next.js.
> Nghiên cứu thư viện qua Context7 (CopilotKit, LangGraph, AG-UI) ngày 2026-07-10.

> ⚠️ **ĐỌC MỤC 12 TRƯỚC** (cập nhật 2026-08-23). Lõi agent đã chuyển sang **DeepAgents**,
> model chính là **DeepSeek** (không còn Gemini), và có thêm endpoint **AG-UI**. Các mục
> 1–11 là lịch sử thiết kế: chỗ nào lệch với mục 12 thì **mục 12 đúng**.

---

## 1. Mục tiêu

Trợ lý AI cho khách truy cập website VHD Corp:

- **Hỏi đáp sản phẩm** từ catalog (ban đầu là file JSON; nay đọc **trực tiếp PostgreSQL** — xem mục "Cập nhật 2026-07-15").
- **Chủ động gửi liên hệ** thay khách (tạo contact → inbox admin + email).
- **Tìm kiếm web** khi cần thông tin ngoài catalog (Tavily).
- **Quản lý hội thoại** như ChatGPT: danh sách, lịch sử, đổi tên, xóa; chỉ tạo hội thoại khi có tin nhắn đầu tiên.
- Trả lời tiếng Việt, đúng brand, an toàn (guardrails).

## 2. Kiến trúc tổng thể

```text
┌──────────────┐   SSE stream (token/tool events)   ┌───────────────────────┐
│ Next.js FE   │ ──────────────────────────────────▶ │ Agent Service (8001)  │
│ Chat Widget  │   REST /conversations CRUD          │ FastAPI + LangGraph   │
└──────────────┘                                     │  • DeepSeek (xem §12) │
       │                                             │  • SQLite (chat.db)   │
       │ trang web hiện tại                          │  • checkpoints.sqlite │
       ▼                                             └──────────┬────────────┘
┌──────────────┐        POST /api/contact                       │ tools
│ NestJS BE    │ ◀──────────────────────────────────────────────┘
│ (8080)       │ → lưu DB + gửi email admin + email khách (nodemailer)
└──────────────┘
```

- **Model** (LỊCH SỬ — nay đã đổi): ban đầu là `gemini-3-flash-preview` qua `langchain-google-genai`. Hiện tại model CHÍNH là **DeepSeek `deepseek-v4-flash-vision-exp`**, Gemini tụt xuống dự phòng — xem §12.1.
- **Giao thức chat**: SSE (Server-Sent Events) trực tiếp FastAPI → browser. Sự kiện chuẩn hóa theo tinh thần AG-UI (`message.delta`, `tool.start`, `tool.end`, `todo`, `ui`, `done`, `error`). Từ 2026-08 có thêm endpoint **AG-UI chuẩn** `/agui/chat` chạy song song (§12.5).

## 3. Service Python — cấu trúc thư mục (base class + kế thừa)

> Cây dưới đây là **hiện trạng code** (đọc lại 2026-08-23).

```text
agent/
├── pyproject.toml            # uv, Python ≥3.13
├── run.sh                    # uv run uvicorn app.main:app --port 8001
├── .env / .env.example       # xem bảng env đầy đủ ở §12.9 (.env.example đang LẠC HẬU)
├── data/
│   ├── products.json         # catalog fallback khi không đọc được Postgres
│   ├── knowledge.md          # tài liệu công ty (bản gốc trong git)
│   ├── knowledge.local.md    # bản admin sửa qua UI (gitignore) — được ưu tiên
│   ├── chat.db               # conversations / messages(+ui_blocks) / memory
│   ├── checkpoints.sqlite    # LangGraph AsyncSqliteSaver
│   └── *.local.json          # skills / mcp_servers / chat_limits / reply_cache / usage_stats
├── skills/                   # 5 SKILL bán hàng (mỗi thư mục 1 SKILL.md) — §12.3
├── skills-admin/             # 3 SKILL cho trợ lý admin — §12.3
├── app/
│   ├── main.py               # FastAPI factory + lifespan (sync catalog, SQLite, MCP, AG-UI)
│   ├── mcp_server.py         # MCP server publish tool catalog tại /mcp
│   ├── core/
│   │   ├── config.py         # pydantic-settings — NGUỒN CHÂN LÝ của mọi biến env
│   │   ├── logging.py
│   │   ├── security.py       # require_admin / require_resync (so sánh hằng thời gian, fail-closed)
│   │   ├── rate_limit.py     # chống spam theo IP + trần toàn cục + cầu dao ngân sách
│   │   ├── reply_cache.py    # cache câu hỏi lặp Y HỆT (§12.7)
│   │   └── usage.py          # thống kê token/chi phí theo từng model
│   ├── db/
│   │   ├── database.py       # aiosqlite: conversations, messages, memory
│   │   ├── repository.py     # ConversationRepo, MessageRepo, MemoryRepo
│   │   └── catalog.py        # pool asyncpg read-only tới Postgres của BE
│   ├── deep/                 # LÕI DeepAgents (§12.2)
│   │   ├── builder.py        # build_deep_agent: middleware + subagent + skills
│   │   ├── admin_agent.py    # deep agent riêng cho trợ lý ADMIN (persona + tool khác)
│   │   ├── default_skills.py # đọc skills/ và skills-admin/ từ ĐĨA
│   │   ├── skills_store.py   # SKILL admin thêm qua UI (data/skills.local.json)
│   │   └── mcp_store.py      # MCP server admin cấu hình (chỉ http/https)
│   ├── guardrails/           # base / length / injection / pipeline
│   ├── memory/               # base / short_term (8 tin) / summary / long_term (facts)
│   ├── tools/
│   │   ├── base.py products.py knowledge.py web_search.py contact.py
│   │   ├── site.py           # search_posts, list_categories, get_recommendations,
│   │   │                     #   get_company_info, add_to_cart, get_current_time
│   │   └── ui.py             # 5 tool gen-UI (show_*) + hàng đợi UI theo lượt
│   ├── graph/
│   │   ├── base.py state.py
│   │   ├── builder.py        # ChatGraphBuilder: dựng chuỗi model + chọn lõi agent
│   │   └── nodes/
│   │       ├── guardrail_node.py   # chặn input xấu → trả lời từ chối lịch sự
│   │       ├── context_node.py     # persona + knowledge + page + summary + facts
│   │       ├── deep_agent_node.py  # LÕI hiện tại (USE_DEEP_AGENT=true)
│   │       ├── agent_node.py       # đường lùi: gọi LLM bind_tools
│   │       └── tool_node.py        # đường lùi: thực thi tool calls
│   ├── services/
│   │   ├── chat_service.py   # orchestration SSE + cache + gen-UI + usage
│   │   ├── memory_service.py # summarize + extract facts (chạy nền)
│   │   ├── knowledge.py product_sync.py vision.py gmail_reader.py
│   └── api/
│       ├── chat.py conversations.py health.py tts.py a2a.py
│       ├── admin.py          # resync / knowledge / emails / chat-limits / usage / cache / top-ips
│       ├── admin_ai.py       # /api/admin/ai/* — trợ lý & sinh nội dung cho admin
│       ├── admin_deep.py     # /api/admin/deep/{skills,mcp}
│       └── agui.py           # /agui/chat — endpoint AG-UI cho CopilotKit
├── scripts/sync_products.py
└── tests/                    # 16 module, 122 test (pytest)
```

### Luồng graph (LangGraph `StateGraph`)

**Hiện tại** (`USE_DEEP_AGENT=true` — mặc định): graph ngoài KHÔNG còn node `tools`, vì
DeepAgents tự lo vòng lặp model⇄tool bên trong node `agent`.

```
START → guardrail → (bị chặn? → END trả lời từ chối)
              ↓ ok
          context (persona VHD + knowledge + trang đang mở + summary + facts)
              ↓
          agent  ← DeepAgents: model ⇄ tool ⇄ subagent ⇄ SKILL (§12.2)
              ↓
             END → background: summarize + extract facts
```

**Đường lùi** (`USE_DEEP_AGENT=false`) — vòng lặp tự viết như thiết kế ban đầu:

```
context → agent (LLM bind_tools) ⇄ tools (products/web/contact/gen-UI) → END
```

- **Checkpoint**: `AsyncSqliteSaver` (`langgraph-checkpoint-sqlite`) — `thread_id` = conversation id → resume đủ trạng thái.
- **Short-term memory**: chỉ đưa N=8 message cuối vào prompt; phần cũ được thay bằng `summary`.
- **Summary + long-term**: sau mỗi lượt trả lời, task nền (asyncio) tóm tắt hội thoại cũ và trích facts (tên khách, nhu cầu, SĐT/email nếu khách cung cấp) vào bảng `memory` — lượt sau `context_node` nạp lại.
- **Guardrails**: pipeline chạy trước graph chính; chặn: input rỗng/quá dài (>2000 ký tự), pattern injection ("ignore previous instructions", lộ system prompt...), spam lặp ký tự.
- **Auto-title**: sau message đầu, đặt tên hội thoại từ nội dung (task nền, dùng model đầu chuỗi — hiện là DeepSeek).
- **Tavily key rotation**: nhận list key qua env; khi 429/432 → chuyển key kế tiếp.

### API contract (FE dùng)

| Method | Path                               | Mô tả                                                                                                                                                                                                               |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/chat`                        | body `{message, conversation_id?, image?, page?}` + header `X-Chat-User` — thiếu id → **tạo hội thoại mới**. SSE: `conversation`, `message.delta`, `tool.start/end`, `todo`, `ui`, `done`, `error` (chi tiết §12.6) |
| GET    | `/api/conversations`               | list `{id, title, updated_at, message_count}`                                                                                                                                                                       |
| GET    | `/api/conversations/{id}/messages` | lịch sử đầy đủ                                                                                                                                                                                                      |
| PATCH  | `/api/conversations/{id}`          | đổi tên                                                                                                                                                                                                             |
| DELETE | `/api/conversations/{id}`          | xóa (kèm checkpoint)                                                                                                                                                                                                |
| GET    | `/api/health`                      | `{status, model, products_loaded}` — **lưu ý**: `model` trả về giá trị `AGENT_MODEL` (tên model Gemini), KHÔNG phải model chính đang chạy (DeepSeek)                                                                |

Định danh khách: `X-Chat-User` — khi đã đăng nhập là `user-<id>`, chưa đăng nhập là uuid lưu ở localStorage (`vhd_chat_uid`) → mỗi khách chỉ thấy hội thoại của mình.

Danh sách endpoint đầy đủ (kể cả admin + AG-UI): §12.8.

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
  > **Cập nhật 2026-08**: đã làm đúng như dự phòng trong ngoặc — thêm endpoint AG-UI `/agui/chat` + runtime CopilotKit self-host trong Next, KHÔNG cần LangGraph Platform. Widget khách vẫn dùng SSE `/api/chat`. Chi tiết §12.5.
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

> **Cập nhật 2026-08 (quyết định đã đổi một phần)**: CopilotKit 1.69 có runtime **self-host**
> (`@copilotkit/runtime/v2` + `InMemoryAgentRunner`) nói chuyện với agent qua **AG-UI** — không
> cần LangGraph Platform nữa. Nên hiện có CẢ HAI: widget khách vẫn dùng SSE `/api/chat` (có
> cache, anti-spam, gen-UI, TTS), còn `/agui/chat` phục vụ client AG-UI/CopilotKit. Xem §12.5.

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

---

## 12. HIỆN TRẠNG 2026-08-23 — Lõi DeepAgents, DeepSeek làm model chính, AG-UI

> Mục này là **nguồn chân lý** cho phần agent. Mọi con số/đường dẫn dưới đây đọc trực tiếp
> từ code (`agent/app/core/config.py`, `agent/app/graph/builder.py`, `agent/app/deep/*`).

### 12.1 Chuỗi model — DeepSeek chính, Gemini + 3 nhà cung cấp khác làm dự phòng

Dựng trong `ChatGraphBuilder.__init__` (`agent/app/graph/builder.py`). Thứ tự thật:

| #    | Model                             | Nhà cung cấp                 | Biến env                                                        | Ghi chú                                                                  |
| ---- | --------------------------------- | ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1    | `deepseek-v4-flash-vision-exp`    | DeepSeek (OpenAI-compatible) | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`       | **MODEL CHÍNH**: 1M context, đọc ảnh (vision), tool-calling. Timeout 30s |
| 2–6  | `gemini-3.1-flash-lite` × 5 key   | Google                       | `AGENT_MODEL`, `GOOGLE_API_KEYS`                                | `thinking_budget=0` (TTFT thấp)                                          |
| 7–11 | `gemini-3.6-flash` × 5 key        | Google                       | `FALLBACK_MODEL` (nhận danh sách phân tách bằng phẩy)           |                                                                          |
| 12   | `openai/gpt-oss-120b`             | Groq                         | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL`                   | dự phòng chéo, miễn phí                                                  |
| 13   | `MiniMax-Text-01`                 | MiniMax                      | `MINIMAX_API_KEY`, `MINIMAX_LLM_MODEL`, `MINIMAX_BASE_URL`      | dùng chung key với TTS                                                   |
| 14   | `inclusionai/ling-3.0-flash:free` | OpenRouter                   | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` | chốt chặn cuối, miễn phí                                                 |

- Con số 14 ứng với `.env` hiện tại (**5 key Gemini × 2 model** = 10). Thêm/bớt key hoặc
  model là tổng đổi theo: `1 + (số model Gemini × số key) + số nhà cung cấp chéo có key`.
- Thứ tự Gemini là **model-major**: model tốt hơn chạy hết mọi key trước, rồi mới hạ model.
- Mọi model đặt `max_retries=0` — gặp 429/5xx là **chuyển ngay** sang model kế tiếp thay vì
  chờ langchain retry (~25s/lần).
- ⚠️ **Chỉ `DEEP_AGENT_MAX_FALLBACKS` model ĐẦU của chuỗi được đưa vào DeepAgents**
  (`chosen = llms[:max_models]`, mặc định **6**). Với cấu hình hiện tại nghĩa là: DeepSeek +
  5 key `gemini-3.1-flash-lite`. Muốn dự phòng chạm tới Groq/MiniMax/OpenRouter thì phải
  tăng `DEEP_AGENT_MAX_FALLBACKS` (hoặc chạy đường lùi `USE_DEEP_AGENT=false`, nơi
  `with_fallbacks` dùng cả 13 model dự phòng).
- **Dự phòng nằm ở `ModelFallbackMiddleware`** (per-model-call), KHÔNG phải `.with_fallbacks`
  bọc quanh graph: model chính lỗi thì chỉ gọi lại **đúng lượt gọi model đó**, không chạy lại
  cả lượt chat (nếu chạy lại, token đã stream cho khách sẽ bị lặp).
- `builder.llm` = model đầu chuỗi (DeepSeek nếu có key) — dùng cho **vision mô tả ảnh** và
  cho memory service (tóm tắt / auto-title / trích facts).
- Không có `DEEPSEEK_API_KEY` → Gemini tự động làm model chính, không vỡ gì.
- Đơn giá từng model để tính chi phí: `agent/app/core/usage.py` → `DEFAULT_MODEL_PRICES`
  (admin ghi đè được qua UI). Model miễn phí (Groq, OpenRouter) để giá 0.

### 12.2 Lõi agent = DeepAgents

`USE_DEEP_AGENT=true` (mặc định) → node `agent` là `DeepAgentNode`, và graph **không còn
node `tools`** vì DeepAgents tự lo vòng lặp model⇄tool. Guardrail, cache câu lặp, memory,
gen-UI, thống kê chi phí vẫn nằm NGOÀI (ở graph + `chat_service`) — DeepAgents chỉ thay
đúng phần "suy nghĩ và gọi tool".

Middleware stack (`agent/app/deep/builder.py::_middleware`), theo thứ tự:

| Middleware                                          | Cấu hình thật                                                                    | Vì sao                                                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `FilesystemMiddleware`                              | allowlist **CHỈ ĐỌC**: `read_file`, `ls`, `glob`, `grep`                         | Đã BỎ `write_file`/`edit_file`/`delete`/`execute` — khách không có lý do ghi file, và prompt-injection cũng không còn tool nào để lợi dụng |
| `TodoListMiddleware`                                | prompt tiếng Việt tự viết (`_TODO_PROMPT`): chỉ lập kế hoạch khi yêu cầu ≥3 bước | Prompt mặc định của thư viện là tiếng Anh, hướng lập trình → model lập kế hoạch cho cả câu chào hỏi                                        |
| `ToolCallLimitMiddleware`                           | `search_products`: **5 lần/lượt**, `exit_behavior="continue"`                    | Đo thật: kho không có món khách hỏi thì model tra tới 20 lần với 20 từ khoá                                                                |
| `ToolCallLimitMiddleware`                           | tổng **15 lần gọi tool/lượt**, `continue`                                        | Trần an toàn chi phí                                                                                                                       |
| `ModelCallLimitMiddleware`                          | **12 vòng gọi model/lượt**, `exit_behavior="end"`                                | Trần an toàn chi phí                                                                                                                       |
| `ModelFallbackMiddleware`                           | các model còn lại trong `chosen`                                                 | Dự phòng per-model-call (§12.1)                                                                                                            |
| `CopilotKitMiddleware` + `StateStreamingMiddleware` | `expose_state=["todos"]`, stream dần `write_todos`                               | Chỉ bật nếu import được `copilotkit`/`ag_ui_langgraph`; thiếu thì bỏ qua, chat SSE không phụ thuộc                                         |

`exit_behavior="continue"` nghĩa là vượt hạn thì **chặn riêng tool đó** nhưng agent vẫn trả
lời bằng dữ liệu đã có — khách luôn nhận được câu trả lời thay vì thấy lỗi.

**17 tool VHD** đăng ký trong `graph/builder.py` (DeepAgents thêm vào đó các tool hệ thống:
`write_todos`, `task`, `read_file`, `ls`, `glob`, `grep`):

`get_current_time` · `search_products` · `get_product_detail` · `search_knowledge` ·
`web_search` · `send_contact_request` · `create_quote_request` · `search_posts` ·
`list_categories` · `get_recommendations` · `get_company_info` · `add_to_cart` ·
`show_product_carousel` · `show_contact_form` · `show_quote_form` · `show_comparison` ·
`show_faq` · `ask_user_question` · `web_fetch` (+ tool từ MCP server admin cấu hình, nạp lúc khởi động).

`web_fetch(url)` đọc nội dung một trang theo đúng địa chỉ khách/admin dán (web_search
chỉ tìm theo từ khoá). Phần chính của công cụ này là an toàn: chỉ http/https, phân giải
tên miền rồi chặn loopback / mạng riêng / link-local / địa chỉ metadata máy chủ, **kiểm
lại sau mỗi lần chuyển hướng**, giới hạn 400KB tải về và 6000 ký tự trả cho model.
Không mang `bash` và `run_code` của harness về: cho trợ lý bán hàng chạy lệnh trên máy
chủ là mở cửa cho người lạ.

`propose_product_update(slug, changes, reason)` — CHỈ trợ lý điều hành có. Trợ lý
**không ghi được** vào cơ sở dữ liệu: nó mô tả thay đổi, giao diện quản trị hiện thẻ
kèm giá trị trước → sau, và chính admin bấm duyệt (bằng phiên đăng nhập của mình) mới
áp dụng. Chỉ 6 trường an toàn: price, stock, status, description, metaTitle, metaDesc.

`ask_user_question(question, options, allow_other)` cho trợ lý **hỏi lại khách bằng nút
bấm** thay vì bắt khách gõ — dùng khi thiếu đúng một thông tin mà câu trả lời nằm trong
tập hữu hạn (chất liệu, nhóm quy cách, khoảng số lượng). Tối đa 5 lựa chọn; dưới 2 lựa
chọn thì tool tự từ chối và nhắc model hỏi bằng lời.

> Đang làm dở trong cây làm việc (chưa commit lúc viết tài liệu này): tool thứ 18
> `ask_user_question` — hỏi lại khách bằng các lựa chọn bấm được, đẩy gen-UI `user-question`
> (tối đa 5 lựa chọn). Khi nó được commit thì sửa mọi chỗ ghi "17 tool" thành 18.

**Deep agent riêng cho ADMIN** (`agent/app/deep/admin_agent.py`): cùng lõi, khác 3 điểm —
persona `ADMIN_PERSONA` (nói thẳng số liệu kho, không bán hàng, KHÔNG tự ghi DB), bộ tool
gọn còn **8 tool tra cứu** (`ADMIN_TOOL_NAMES`: `search_products`, `get_product_detail`,
`list_categories`, `search_knowledge`, `get_company_info`, `search_posts`, `web_search`,
`get_recommendations` — bỏ hết tool giao diện khách và `add_to_cart`), và SKILL lấy từ
`skills-admin/`. Agent này được **cache 1 lần cho cả tiến trình** (`get_admin_agent()`,
`reset_admin_agent()` để xoá cache trong test) và chạy với `recursion_limit = 100` — mức mặc
định 25 của LangGraph hết sạch sau 3–4 lần gọi tool vì mỗi vòng model⇄tool đi qua ~8 node.

### 12.3 SKILL — quy trình nghiệp vụ dạng file

SKILL là 1 thư mục chứa `SKILL.md` theo chuẩn Agent Skills. DeepAgents chỉ nạp
**frontmatter** (`name` + `description`) vào system prompt; nội dung đầy đủ chỉ được đọc khi
model thấy cần (progressive disclosure) → thêm nhiều skill cũng không phình context.

Hai nguồn, đọc từ **ĐĨA** (`agent/app/deep/default_skills.py`):

| Thư mục               | Dùng cho                       | Đang có                                                                                                              |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `agent/skills/`       | trợ lý bán hàng (chat khách)   | `bao-gia-si`, `chot-don-va-giao-hang`, `khuon-mau-va-duc-nhua`, `quy-cach-gioang`, `tu-van-chat-lieu-cao-su` (**5**) |
| `agent/skills-admin/` | trợ lý điều hành (trang admin) | `ra-soat-kho-hang`, `soan-bai-viet-seo`, `viet-mo-ta-san-pham` (**3**)                                               |

Nguồn thứ ba: SKILL admin tự thêm qua giao diện, lưu ở `data/skills.local.json`
(`agent/app/deep/skills_store.py`). Thứ tự merge trong `DeepAgentNode`:
`default_skills.to_files()` rồi `skills_store.to_files()` → **skill admin cùng tên GHI ĐÈ
bản mặc định**. Cả hai đều đưa vào state DeepAgents dưới đường dẫn ảo `/skills/<slug>/SKILL.md`
(StateBackend — không ghi xuống đĩa thật, nên chat không có đường chạm vào filesystem).

**Thêm skill mới bằng cách tạo file** (dev):

```bash
mkdir -p agent/skills/ten-skill-moi
cat > agent/skills/ten-skill-moi/SKILL.md << 'MD'
---
name: ten-skill-moi          # slug: chỉ chữ thường, số, gạch nối
description: Một dòng mô tả khi nào dùng skill này — model đọc dòng này để quyết định mở
---

# Tiêu đề

## Khi nào dùng
...

## Quy trình
1. Hỏi khách ...
2. Tra bằng tool search_products ...
MD
```

`DeepAgentNode.run` gọi `default_skills.to_files()` + `skills_store.to_files()` **ở MỖI lượt
chat**, và cả hai đều đọc lại từ đĩa/JSON (không cache) → thêm/sửa skill có hiệu lực ngay ở
lượt chat kế tiếp, **không cần restart agent**. (Docstring `default_skills.py` còn ghi "sửa
file rồi khởi động lại agent" — thận trọng quá, code không cần vậy. Chỉ **MCP server** mới
phải restart vì nạp ở lifespan.)

Quy tắc viết skill (ghi trong docstring `default_skills.py`): **chỉ mô tả QUY TRÌNH** (hỏi gì,
tra tool nào, thứ tự nào). **KHÔNG nhúng dữ liệu kinh doanh** (giá, bậc chiết khấu, tồn kho,
thời gian giao) — những thứ đó phải tra bằng tool, viết cứng vào skill là agent sẽ nói số
liệu sai một cách rất thuyết phục.

Giới hạn: 1 file skill > **40.000 byte** bị bỏ qua (chốt chặn context); skill admin thêm qua
UI tối đa **100 skill**, nội dung tối đa **20.000 ký tự**.

### 12.4 Subagent — việc nặng chạy trong context riêng

`agent/app/deep/builder.py::_subagents` khai báo **2 subagent**. Agent chính gọi chúng qua
tool `task`; subagent chạy trong context riêng rồi trả về **bản tóm tắt** → hội thoại chính
không phải trả tiền cho dữ liệu thô ở mọi lượt sau.

| Subagent           | Khi nào dùng                                                 | Tool được cấp                                                                     |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `tra-cuu-san-pham` | tra cứu/so sánh **≥3 mặt hàng** hoặc phải thử nhiều quy cách | `search_products`, `get_product_detail`, `list_categories`, `get_recommendations` |
| `tra-cuu-tai-lieu` | câu hỏi chính sách/dịch vụ phải đối chiếu nhiều mục tài liệu | `search_knowledge`, `get_company_info`, `search_posts`                            |

### 12.5 AG-UI + CopilotKit (chạy SONG SONG với `/api/chat`)

- **Agent**: `agent/app/api/agui.py` gắn **2 endpoint** AG-UI bằng `ag-ui-langgraph 0.0.43` +
  `copilotkit 0.1.95`: **`/agui/chat`** (agent `vhd_chat`, graph chat khách) và
  **`/agui/admin`** (agent `vhd_admin`, deep agent của trợ lý điều hành). `main.py` dựng
  admin agent ngay trong lifespan để lỗi cấu hình lộ ra lúc khởi động; dựng lỗi thì chỉ bỏ
  AG-UI admin, chat khách vẫn chạy. Thiếu 2 thư viện → không bật endpoint nào, service vẫn chạy.
- Có bản vá `_AguiAgent.clone()`: `LangGraphAgent.clone()` truyền 3 tham số mà
  `LangGraphAGUIAgent.__init__` không nhận → nếu không vá thì **mọi request AG-UI trả 500**.
  Không thể bỏ clone vì adapter giữ trạng thái run trong instance.
- **KHÔNG thay thế `/api/chat`**: AG-UI không đi qua cache câu lặp và anti-spam theo IP (hai
  thứ đó nằm ở tầng API cũ) → chỉ dùng cho giao diện nội bộ/đã đăng nhập, không mở cho khách
  vô danh.
- **FE**: route handler `fe/app/copilotkit/[[...slug]]/route.ts` — runtime CopilotKit
  self-host (`@copilotkit/runtime/v2` + `InMemoryAgentRunner` + `HttpAgent` của `@ag-ui/client`),
  `basePath: "/copilotkit"`, agent `vhd_chat` trỏ tới `AGENT_AGUI_URL` (mặc định
  `http://localhost:8001/agui/chat`). Biến `AGENT_AGUI_URL` **chưa có trong `fe/.env.example`**
  → hiện đang chạy bằng giá trị mặc định.
- ⚠️ Route **KHÔNG đặt dưới `/api/`**: nginx production đẩy toàn bộ `/api/*` sang NestJS:8080
  nên route handler Next sẽ không bao giờ chạy (xem `deploy/nginx.conf`).
- **Trang demo**: `/copilot-demo` (`fe/app/copilot-demo/`) — headless, dùng hook `useAgent`
  từ `@copilotkit/react-core/v2`, tự vẽ bong bóng + `AgentPlan` + `AgentTrace`. Vì
  `/agui/chat` không đưa `todos` vào `STATE_SNAPSHOT`, trang này lấy todo từ tham số của lần
  gọi `write_todos` gần nhất.
- Phiên bản FE: `@copilotkit/react-core` & `@copilotkit/runtime` **1.69.0**, `@ag-ui/client` **0.0.57**.

### 12.6 Hợp đồng SSE (`/api/chat`) — đã bổ sung `todo` và `input`/`output`

`agent/app/services/chat_service.py` yield các event sau (FE tiêu thụ ở
`fe/components/chat/use-chat.ts`, kiểu ở `fe/types/chat.ts`):

| Event           | Payload                       | Ghi chú                                                                                                                                                                                                   |
| --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversation`  | `{id, title}`                 | chỉ ở lượt đầu (tạo hội thoại mới)                                                                                                                                                                        |
| `message.delta` | `{content}`                   | từng mảnh chữ                                                                                                                                                                                             |
| `todo`          | `{items:[{content, status}]}` | **MỚI** — sinh từ lần gọi `write_todos`, bắn ở `on_tool_start`, thay cả danh sách (last-wins). `status` ∈ `pending`/`in_progress`/`completed`; `content` cắt ở 300 ký tự. FE render component `AgentPlan` |
| `tool.start`    | `{name, input}`               | **`input` MỚI** — payload rút gọn ≤ **600 ký tự**                                                                                                                                                         |
| `tool.end`      | `{name, output}`              | **`output` MỚI** — lấy `.content` của ToolMessage, rút gọn ≤ **600 ký tự**. `write_todos` KHÔNG bắn `tool.end`                                                                                            |
| `ui`            | `{component, props}`          | gen-UI; được persist vào `messages.ui_blocks` nên reload không mất                                                                                                                                        |
| `done`          | `{message_id, cached?}`       | `cached: true` khi trả từ cache câu lặp                                                                                                                                                                   |
| `error`         | `{message}`                   |                                                                                                                                                                                                           |

`/api/admin/ai/assistant/stream` dùng **cùng tên event** (`message.delta`, `tool.start`,
`tool.end`, `todo`, `error`) để giao diện admin hiện kế hoạch + log tool; khác duy nhất ở
`done` — trả `{reply: <toàn bộ văn bản>}` thay vì `{message_id}` (trợ lý admin không lưu
hội thoại), và không có event `conversation`/`ui`.

### 12.7 Cache câu hỏi lặp (`agent/app/core/reply_cache.py`)

- **Khoá = câu hỏi chuẩn hoá NFC + SECTION của trang.** Chuẩn hoá: NFC (gộp dấu tiếng Việt
  về 1 dạng) → hạ hoa/thường → gộp khoảng trắng → bỏ dấu câu cuối. SECTION = **segment đầu**
  của path (`/products/ong-nhua-d21` → `/products`).
- Cache **dùng chung mọi khách** (không phân theo user) và **tra ở MỌI lượt**; chỉ **LƯU** ở
  lượt đầu hội thoại.
- Điều kiện lưu: không có ảnh, không emit UI, và tập tool đã dùng ⊆ `{search_knowledge}` —
  tức là hễ dùng tool động (giá/tồn/gợi ý/thời gian) thì **không cache**.
- Tự vô hiệu khi persona hoặc knowledge đổi (khoá phiên bản = `sha256(persona + knowledge)`),
  TTL **14 ngày**, tối đa **1000 entry** (LRU), độ dài câu hỏi 1–400 ký tự sau chuẩn hoá.
- Lưu bền ở `data/reply_cache.local.json`. Bật/tắt bằng `cache_enabled` trong cấu hình
  chống spam; xoá sạch bằng `POST /api/admin/cache/clear`.
- Ghi chú: docstring của module vẫn còn dòng cũ "không page_context" — code hiện tại **đưa
  page vào khoá**, không loại bỏ nữa.

### 12.8 Endpoint map (agent → BE → FE)

**Agent (FastAPI, cổng 8001)**

| Method           | Path                                                                                  | Bảo vệ                                    |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| POST             | `/api/chat`                                                                           | header `X-Chat-User` + rate-limit theo IP |
| GET/PATCH/DELETE | `/api/conversations[...]`                                                             | theo `X-Chat-User`                        |
| POST             | `/api/tts`                                                                            | —                                         |
| GET              | `/api/health`                                                                         | —                                         |
| GET/POST         | `/.well-known/agent-card.json`, `/a2a`                                                | A2A (có rate-limit)                       |
| —                | `/mcp` (streamable-http)                                                              | mount MCP server                          |
| POST             | `/agui/chat`, `/agui/admin` (mỗi endpoint có `/health` kèm theo)                      | AG-UI (không có cache/anti-spam)          |
| POST             | `/api/admin/resync-products`                                                          | `X-Resync-Secret`                         |
| GET/PUT          | `/api/admin/knowledge`                                                                | `X-Admin-Secret`                          |
| GET              | `/api/admin/emails`                                                                   | `X-Admin-Secret`                          |
| GET/PUT          | `/api/admin/chat-limits`                                                              | `X-Admin-Secret`                          |
| GET              | `/api/admin/usage`, `/api/admin/top-ips`                                              | `X-Admin-Secret`                          |
| POST             | `/api/admin/cache/clear`                                                              | `X-Admin-Secret`                          |
| POST             | `/api/admin/ai/product-description`, `/post-draft`, `/assistant`, `/assistant/stream` | `X-Admin-Secret`                          |
| GET/POST         | `/api/admin/deep/skills`, `/api/admin/deep/mcp`                                       | `X-Admin-Secret`                          |
| DELETE           | `/api/admin/deep/skills/{slug}`, `/api/admin/deep/mcp/{name}`                         | `X-Admin-Secret`                          |

`RESYNC_SECRET`/`ADMIN_SECRET` mặc định **RỖNG = fail-closed** (chưa đặt trong `.env` thì mọi
request admin bị từ chối — không còn giá trị mặc định đoán được).

**BE NestJS proxy** (`be/src/services/agent/agent.controller.ts`, `@Controller('agent')`,
guard `JwtAuthGuard + RolesGuard`, `@Roles(ADMIN, STAFF)`) — secret chỉ nằm ở BE:

`GET/PUT /api/agent/knowledge` · `GET /api/agent/usage` · `GET /api/agent/top-ips` ·
`POST /api/agent/cache/clear` · `GET/PUT /api/agent/chat-limits` ·
`POST /api/agent/ai/{product-description,post-draft,assistant}` ·
`GET/POST /api/agent/deep/skills` + `DELETE /api/agent/deep/skills/:slug` ·
`GET/POST /api/agent/deep/mcp` + `DELETE /api/agent/deep/mcp/:name`.

Env BE: `AGENT_URL` (mặc định `http://localhost:8001`), `AGENT_ADMIN_SECRET`, `AGENT_RESYNC_SECRET`.

⚠️ **Chưa có proxy BE cho `/assistant/stream`** — endpoint SSE đó hiện chỉ gọi được trực tiếp
vào agent bằng `X-Admin-Secret`; trang `/admin/ai-assistant` đang dùng bản KHÔNG stream
(`POST /api/agent/ai/assistant`).

**FE**: trang `/admin/agent-config` ("Kỹ năng & công cụ AI") gọi `fe/services/agent-deep.service.ts`
(`BASE = "/agent/deep"`) → BE → agent. Chat khách gọi **trực tiếp** agent qua
`NEXT_PUBLIC_AGENT_URL` (dev `http://localhost:8001`, prod `https://<domain>/agent`), không
đi qua NestJS.

### 12.9 Biến môi trường `agent/.env` (đọc từ `app/core/config.py`)

> ⚠️ `agent/.env.example` **đang lạc hậu** (còn `AGENT_MODEL=gemini-3-flash-preview`, thiếu
> DeepSeek/Groq/OpenRouter/`GOOGLE_API_KEYS`/`FALLBACK_MODEL`). Dùng bảng dưới đây làm chuẩn.

| Biến                                                                                   | Mặc định trong code                                                    | Việc                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEEPSEEK_API_KEY`                                                                     | _(rỗng)_                                                               | **Model chính**. Rỗng = tắt DeepSeek, Gemini làm chính                                                                                                 |
| `DEEPSEEK_MODEL`                                                                       | `deepseek-v4-flash-vision-exp`                                         |                                                                                                                                                        |
| `DEEPSEEK_BASE_URL`                                                                    | `https://api.deepseek.com`                                             |                                                                                                                                                        |
| `USE_DEEP_AGENT`                                                                       | `true`                                                                 | `false` = quay về vòng lặp agent⇄tools tự viết (đường lùi an toàn)                                                                                     |
| `DEEP_AGENT_MAX_FALLBACKS`                                                             | `6`                                                                    | Số model đưa vào deep agent (model đầu là chính)                                                                                                       |
| `GOOGLE_API_KEY`                                                                       | _(rỗng)_                                                               | Dùng khi `GOOGLE_API_KEYS` rỗng                                                                                                                        |
| `GOOGLE_API_KEYS`                                                                      | _(rỗng)_                                                               | Nhiều key Gemini phân tách bằng phẩy — fallback cho nhau                                                                                               |
| `AGENT_MODEL`                                                                          | `gemini-3.1-flash-lite`                                                | Model Gemini chính                                                                                                                                     |
| `FALLBACK_MODEL`                                                                       | `gemini-3.6-flash`                                                     | Có thể là DANH SÁCH phân tách bằng phẩy                                                                                                                |
| `GROQ_API_KEY` / `GROQ_MODEL` / `GROQ_BASE_URL`                                        | – / `openai/gpt-oss-120b` / `https://api.groq.com/openai/v1`           | Dự phòng chéo, miễn phí                                                                                                                                |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL`                      | – / `inclusionai/ling-3.0-flash:free` / `https://openrouter.ai/api/v1` | Chốt chặn cuối                                                                                                                                         |
| `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID`                                                 | _(rỗng)_                                                               | TTS **chính** (`/api/tts`) **và** LLM dự phòng chéo — dùng chung key                                                                                   |
| `MINIMAX_LLM_MODEL` / `MINIMAX_BASE_URL`                                               | `MiniMax-Text-01` / `https://api.minimax.io/v1`                        |                                                                                                                                                        |
| `PTIT_TTS_URL`                                                                         | `https://aitools.ptit.edu.vn/holobox/synthesize`                       | TTS **dự phòng** khi MiniMax lỗi (WAV, nội bộ). ⚠️ Comment trong `config.py` còn ghi ngược (nói PTIT là chính) — code ở `api/tts.py` gọi MiniMax trước |
| `TAVILY_API_KEYS`                                                                      | _(rỗng)_                                                               | Danh sách key, xoay vòng khi bị rate-limit                                                                                                             |
| `CATALOG_DATABASE_URL`                                                                 | _(rỗng)_                                                               | Đọc trực tiếp Postgres của BE; rỗng → fallback `products.json`                                                                                         |
| `BE_API_URL`                                                                           | `http://localhost:8080/api`                                            |                                                                                                                                                        |
| `PORT`                                                                                 | `8001`                                                                 |                                                                                                                                                        |
| `CORS_ORIGINS`                                                                         | `http://localhost:3001`                                                | Danh sách phân tách bằng phẩy                                                                                                                          |
| `PUBLIC_BASE_URL`                                                                      | `http://localhost:8001`                                                | Dùng cho Agent Card A2A                                                                                                                                |
| `SHORT_TERM_LIMIT`                                                                     | `8`                                                                    | Số message gần nhất đưa vào prompt                                                                                                                     |
| `MAX_INPUT_CHARS`                                                                      | `2000`                                                                 | Guardrail độ dài                                                                                                                                       |
| `RESYNC_SECRET` / `ADMIN_SECRET`                                                       | _(rỗng = fail-closed)_                                                 |                                                                                                                                                        |
| `GMAIL_IMAP_USER` / `GMAIL_IMAP_PASSWORD` / `GMAIL_IMAP_HOST`                          | – / – / `imap.gmail.com`                                               | Đọc hộp thư admin                                                                                                                                      |
| `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` / `LANGSMITH_ENDPOINT` | `false` / – / `vhdcorp-agent` / `https://api.smith.langchain.com`      |                                                                                                                                                        |
| `CHAT_DB_PATH` / `CHECKPOINT_DB_PATH` / `PRODUCTS_JSON_PATH` / `KNOWLEDGE_MD_PATH`     | `agent/data/...`                                                       | Ít khi phải đổi                                                                                                                                        |

### 12.10 Kiểm thử & deploy

```bash
cd agent && rtk pytest                 # 122 test (16 module) — 118 tất định + 4 test 'live'
cd agent && rtk pytest -m "not live"   # 118 test tất định — CI chạy đúng lệnh này

python3 scripts/e2e-agent.py                              # 20 phép thử qua HTTP thật (localhost:8001)
python3 scripts/e2e-agent.py --url https://vhdcorp.com/agent   # chạy thẳng trên production
```

- `scripts/e2e-agent.py`: **7 nhóm test / 20 phép kiểm** (`check()`) — chat cơ bản, cache câu
  lặp, tìm sản phẩm + slug, không bịa hàng không có, SKILL nghiệp vụ, AG-UI, chặn spam. Chỉ
  nhận cờ `--url` (mặc định `http://127.0.0.1:8001`); tự giãn nhịp 4s/lượt và chờ 20s + thử
  lại 2 lần khi bị anti-spam chặn.
- 4 test gắn `@pytest.mark.live` (gọi LLM/dịch vụ thật) nằm ở `test_a2a.py`, `test_api.py`,
  `test_image.py`, `test_ui_tools.py`. Marker `live` **chưa khai báo** trong `pyproject.toml`
  (chỉ có `integration`) → pytest in `PytestUnknownMarkWarning`, việc lọc vẫn đúng.
- CI (`.github/workflows/deploy.yml`): 4 job song song `be` / `fe_build` / `fe_check` /
  `agent`, rồi job gate tên **`test`** (dùng cho branch protection), rồi `deploy` khi push `main`.
- `scripts/deploy.sh`: nhận **`DEPLOY_BRANCH`** (mặc định `main`) nên deploy được nhánh khác;
  tự thêm `~/.local/bin` (và `~/.cargo/bin`, `/usr/local/bin`) vào `PATH` để tìm `uv` — shell
  SSH không-đăng-nhập không có sẵn đường dẫn này nên trước đây deploy chết ở bước `uv sync`.
  7 bước: backup build → pull → BE (install/migrate/build) → FE build → `uv sync --frozen` →
  PM2 reload → smoke test, **fail là tự rollback** về code + build cũ.
