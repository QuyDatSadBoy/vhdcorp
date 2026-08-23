# VHD Corp — Vận hành & CI/CD (đọc để chạy production hằng ngày)

> Trả lời: quy trình push/merge code, CI/CD chạy thế nào, test lại PR ra sao, theo dõi server, cảnh báo, xử lý sự cố.
> Liên quan: [DEPLOY.md](DEPLOY.md) (setup lần đầu) · [TINH_NANG.md](TINH_NANG.md) (tính năng) · [HANDOVER.md](HANDOVER.md) (changelog).

## 1. Luồng làm việc chuẩn (Git flow)

```
main  ──(production, protected, auto-deploy khi merge)
  ▲
  │  Pull Request  (chạy TEST tự động trước khi merge)
  │
fix/tinh-nang-x  ──(checkout từ main, code ở đây)
```

Quy trình mỗi lần sửa:

```bash
git checkout main && git pull                 # lấy bản mới nhất
git checkout -b fix/mo-ta-ngan                # nhánh làm việc mới
# ... sửa code ...
git add -A && git commit -m "..."
git push -u origin fix/mo-ta-ngan
# → lên GitHub mở Pull Request vào main → CI chạy test → xanh thì Merge → tự deploy
```

- **1 người dùng**: không cần nhánh `develop`; mỗi việc 1 nhánh ngắn từ `main` là đủ.
- `main` được **bảo vệ** (không push thẳng, phải qua PR) — an toàn cho production.

### 1b. Luồng phát hành thực tế đang dùng: `scripts/ship.sh`

Script này là **cửa chắn thay CI** (comment trong script ghi rõ: GitHub Actions của repo đang
không chạy được vì hết quota, nên máy local là cửa chắn duy nhất trước production).

```bash
bash scripts/ship.sh                       # kiểm thử ĐỦ ở local, KHÔNG deploy
bash scripts/ship.sh --deploy               # PASS hết mới deploy lên VPS
bash scripts/ship.sh --deploy --skip-e2e    # bỏ phần gọi model thật (nhanh hơn)
```

5 bước, hỏng bước nào là **dừng, không deploy**:

1. Cây làm việc phải **sạch** (deploy kéo code từ remote → thay đổi chưa commit sẽ không lên server).
2. Agent: `pytest` (toàn bộ, kể cả test `live`).
3. BE: `tsc --noEmit` + `yarn build`.
4. FE: `tsc --noEmit` + `yarn lint` + `yarn build`.
5. E2E: dựng agent thật ở **cổng 8199** (không đụng agent 8001 đang chạy) → `scripts/e2e-agent.py`
   **20 phép thử**. Deploy xong còn chạy lại e2e **thẳng trên `https://vhdcorp.com/agent`**.

Nhánh deploy mặc định của ship.sh là **`develop`** (`DEPLOY_BRANCH=develop`), VPS mặc định
`root@116.118.6.61` (đổi bằng biến `VPS_HOST`). Đổi nhánh: `DEPLOY_BRANCH=main bash scripts/ship.sh --deploy`.

## 2. CI/CD hoạt động thế nào (`.github/workflows/deploy.yml`)

> ⚠️ Workflow này chỉ chạy khi GitHub Actions còn quota. Khi hết quota, dùng `scripts/ship.sh`
> (§1b) — nó chạy đúng những phép thử của CI, cộng thêm e2e qua HTTP thật.

4 job kiểm thử chạy **song song**, rồi 1 job gate, rồi deploy:

| Job          | Chạy khi                                      | Làm gì                                                                                                                    |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **be**       | mở/cập nhật PR vào main · push main · bấm tay | `yarn tsc --noEmit` + `yarn test` + `yarn build` (chạy song song trong job)                                               |
| **fe_build** | như trên                                      | `yarn build` (compile-only)                                                                                               |
| **fe_check** | như trên                                      | `yarn lint` + `yarn tsc --noEmit`                                                                                         |
| **agent**    | như trên                                      | `uv run --no-sync pytest -q -m "not live"` (118 test tất định)                                                            |
| **test**     | PR hoặc bấm tay                               | **Job gate** — đỏ nếu bất kỳ job trên fail. Đây là tên dùng cho branch protection, ĐỪNG đổi                               |
| **deploy**   | CHỈ khi push vào `main`                       | SSH vào VPS chạy `DEPLOY_BRANCH=main bash scripts/deploy.sh` (pull → build → migrate → reload → smoke → rollback nếu lỗi) |

> Job `deploy` **không** khai `needs: test` — commit vào `main` chỉ đến từ PR đã test xanh
> (branch protection), và `deploy.sh` còn có smoke test + tự rollback. Vì vậy **branch
> protection cho `main` là bắt buộc** để giữ nguyên tắc "test pass mới lên bản mới".

**Nguyên tắc "test pass mới lên bản mới"**:

- Test **đỏ** → job deploy bị **skip** → server **giữ nguyên bản cũ**.
- Test **xanh** nhưng deploy gặp lỗi build/smoke trên server → `deploy.sh` **tự rollback** về build + code cũ → server tiếp tục chạy bản ổn định.
- Mở PR chỉ chạy **test** (KHÔNG deploy). Deploy chỉ khi **merge** vào main.

## 3. Test lại PR / chạy lại workflow

- **Commit thêm vào nhánh PR** → workflow **tự chạy lại test** cho PR đó (mỗi push = 1 lần test mới).
- **Nút chạy lại thủ công**: GitHub → tab **Actions** → mở run → góc phải có **"Re-run all jobs"** / **"Re-run failed jobs"**.
- **Chạy tay không cần commit**: Actions → workflow **CI/CD** → **"Run workflow"** (nhờ `workflow_dispatch`).
- (Khuyến nghị) Bật **branch protection** cho `main`: Settings → Branches → Add rule → _Require status checks to pass_ → chọn job **test**. Khi đó GitHub **chặn nút Merge** nếu test chưa xanh.

## 4. Test có những gì

| Tầng                   | Chạy ở                                              | Nội dung                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BE unit                | CI + local (`cd be && yarn test`)                   | voucher (9 case biên), giá KM hết hạn, biến email `{{name}}`                                                                                                                                               |
| BE build/typecheck     | CI + local                                          | `yarn tsc --noEmit` + `yarn build`                                                                                                                                                                         |
| FE                     | CI + local                                          | `yarn lint` + `yarn tsc --noEmit` + `yarn build`                                                                                                                                                           |
| Agent (tất định)       | CI + local (`rtk pytest -m "not live"`)             | **118 test**: tools, guardrails, knowledge, danh mục, A2A schema, memory, gen-UI, cache câu lặp, deep agent, admin deep (skill/MCP), TTS, MCP                                                              |
| Agent (live LLM)       | local/staging (`rtk pytest`)                        | 4 test gọi LLM thật (`@pytest.mark.live`) — CI bỏ qua để khỏi phụ thuộc quota/mạng. Tổng suite = **122 test**                                                                                              |
| **Agent E2E qua HTTP** | local hoặc **thẳng production**                     | `python3 scripts/e2e-agent.py` — **20 phép thử** (chat, cache câu lặp, tìm SP + slug, không bịa hàng không có, SKILL nghiệp vụ, AG-UI, chặn spam). Chạy trên production: `--url https://vhdcorp.com/agent` |
| **Smoke (toàn diện)**  | **trên server sau mỗi deploy** (`scripts/smoke.sh`) | health 3 service, API, SEO, phân quyền (401), order-guard, voucher, admin login + cookie, **agent A2A + chat SSE với LLM thật**                                                                            |

→ Phần LLM thật được kiểm ở smoke (server có key thật) nên vẫn phủ 100% end-to-end, mà CI vẫn nhanh/ổn định.

## 5. Theo dõi server (SSH vào VPS)

```bash
ssh root@116.118.6.61
pm2 status                       # trạng thái 3 service (online/errored/restart count)
pm2 logs                         # log realtime tất cả
pm2 logs vhd-be --lines 200      # log 1 service
pm2 monit                        # bảng CPU/RAM realtime
free -m ; df -h /                # RAM + disk
systemctl status nginx postgresql
bash ~/vhdcorp/scripts/smoke.sh  # tự kiểm toàn bộ luồng bất cứ lúc nào
```

Chỉ số cần để mắt: PM2 cột `↺` (restart nhiều = đang crash-loop), RAM `available` (nên >300MB), disk (<90%).

## 6. Cảnh báo (alert) — khuyến nghị bật

Hiện chưa có alert tự động. 3 cách nhẹ, chọn 1:

1. **UptimeRobot** (free): tạo monitor HTTPS `https://vhdcorp.com/api/health` mỗi 5 phút → email/Telegram khi down. Nhanh nhất, khuyên dùng.
2. **PM2 tự phục hồi** (đã bật): service crash → PM2 tự restart; `max_memory_restart` chặn rò rỉ RAM.
3. **Cron smoke + báo Telegram**: `*/10 * * * * bash ~/vhdcorp/scripts/smoke.sh || curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=VHD%20down"`.

> Cloudflare cũng gửi email khi origin unreachable (bật ở Notifications).

## 7. Rollback thủ công (nếu cần về bản trước)

```bash
ssh root@116.118.6.61 && cd ~/vhdcorp
git log --oneline -5                       # tìm commit tốt trước đó
git reset --hard <SHA_TỐT>
cd be && yarn build && cd ../fe && yarn build
cd .. && pm2 reload ecosystem.config.js
```

(deploy.sh đã tự rollback khi smoke fail; đây là rollback tay khi muốn về bản cũ hơn.)

## 8. Xử lý sự cố nhanh

| Triệu chứng                          | Kiểm tra                                                                                                                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site 502/521                         | `pm2 status` (service chết?) · `systemctl status nginx` · Cloudflare SSL mode = Full                                                                                                                                                                       |
| Login không được                     | cookie: `be/.env` phải `COOKIE_DOMAIN=.vhdcorp.com` + `NODE_ENV=production`; truy cập qua HTTPS                                                                                                                                                            |
| Agent không trả lời                  | `pm2 logs vhd-agent`. Kiểm `DEEPSEEK_API_KEY` (model chính) và `GOOGLE_API_KEYS`; nếu hết quota cả hai thì tăng `DEEP_AGENT_MAX_FALLBACKS` để dùng tới Groq/MiniMax/OpenRouter. Kiểm nhanh: `python3 scripts/e2e-agent.py --url https://vhdcorp.com/agent` |
| Endpoint admin của agent trả **403** | `ADMIN_SECRET`/`RESYNC_SECRET` trong `agent/.env` để RỖNG là **fail-closed** (chặn hết). Phải khớp `AGENT_ADMIN_SECRET`/`AGENT_RESYNC_SECRET` trong `be/.env`                                                                                              |
| Sửa kỹ năng AI mà chat chưa đổi      | Kỹ năng áp dụng ngay lượt sau. Còn **MCP server** thì phải `pm2 restart vhd-agent` (giao diện đã báo `restart_required`)                                                                                                                                   |
| Deploy fail trên Actions             | mở log job → thường do test đỏ (sửa code) hoặc VPS hết RAM lúc build (swap 4GB đã bật)                                                                                                                                                                     |
| DB lỗi                               | `systemctl status postgresql` · `sudo -u postgres psql vhdcorp_prod`                                                                                                                                                                                       |

## 9. Bảo mật định kỳ

- Đổi mật khẩu root VPS + mật khẩu admin web (mặc định seed) sau bàn giao.
- Backup DB hằng đêm: `crontab -e` → `0 2 * * * sudo -u postgres pg_dump vhdcorp_prod > ~/backup_$(date +\%F).sql`
- (Khuyến nghị Cloudflare) bật security headers: SSL/TLS → Edge → HSTS; Rules → thêm `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.

## Xem log & quản trị server qua Terminal (SSH)

Trang **Quản trị → Server** đã xem được log + chẩn đoán ngay trên web (an toàn).
Khi cần shell đầy đủ, SSH vào VPS rồi dùng các lệnh sau:

```bash
ssh root@116.118.6.61

# Xem log service (theo dõi realtime — Ctrl+C để thoát)
pm2 logs vhd-be         # backend
pm2 logs vhd-fe         # frontend
pm2 logs vhd-agent      # AI agent
pm2 logs                # tất cả cùng lúc
pm2 logs vhd-be --lines 200 --nostream   # 200 dòng gần nhất, không theo dõi

# Trạng thái & tài nguyên
pm2 status              # bảng service
pm2 monit               # dashboard realtime CPU/RAM từng service
free -h                 # RAM
df -h                   # ổ đĩa
top / htop              # tiến trình

# Nginx
tail -f /var/log/nginx/error.log     # log lỗi nginx
tail -f /var/log/nginx/access.log    # log truy cập
nginx -t && systemctl reload nginx   # kiểm tra cấu hình rồi reload

# Log hệ điều hành
journalctl -n 200 --no-pager         # 200 dòng gần nhất
journalctl -u nginx -f               # theo dõi service cụ thể

# Deploy tay (khi cần — vẫn qua pipeline có smoke test + tự rollback)
cd /root/vhdcorp && git fetch origin main && git checkout -B main origin/main && bash scripts/deploy.sh

# Deploy một nhánh KHÁC main (vd thử bản develop trên VPS)
cd /root/vhdcorp && DEPLOY_BRANCH=develop bash scripts/deploy.sh

# Backup DB tay
sudo -u postgres pg_dump vhdcorp_prod | gzip > /root/vhd_backup_$(date +%F).sql.gz
```

> ⚠️ KHÔNG bao giờ nhúng web terminal chạy lệnh tùy ý vào trang admin — nếu tài khoản
> admin bị lộ, kẻ tấn công có full quyền root qua trình duyệt. Shell qua SSH (có key)
> an toàn hơn nhiều. Trang Server chỉ chạy các lệnh whitelist chỉ-đọc.
