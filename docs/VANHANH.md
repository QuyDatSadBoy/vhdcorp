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

## 2. CI/CD hoạt động thế nào (`.github/workflows/deploy.yml`)

2 job:
| Job | Chạy khi | Làm gì |
|---|---|---|
| **test** | mở/cập nhật PR vào main · push main · bấm tay | BE (tsc + unit test + build) · FE (lint + tsc + build) · Agent (pytest tất định) |
| **deploy** | CHỈ khi push vào `main` **và** job test XANH | SSH vào VPS chạy `scripts/deploy.sh` (pull → build → migrate → reload → smoke → rollback nếu lỗi) |

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

| Tầng                  | Chạy ở                                              | Nội dung                                                                                                                        |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| BE unit               | CI + local (`cd be && yarn test`)                   | voucher (9 case biên), giá KM hết hạn, biến email `{{name}}`                                                                    |
| BE build/typecheck    | CI + local                                          | `yarn tsc --noEmit` + `yarn build`                                                                                              |
| FE                    | CI + local                                          | `yarn lint` + `yarn tsc --noEmit` + `yarn build`                                                                                |
| Agent (tất định)      | CI + local (`uv run pytest -m "not live"`)          | 51 test: tools, guardrails, knowledge, danh mục, A2A schema, memory, gen-UI                                                     |
| Agent (live LLM)      | local/staging (`uv run pytest`)                     | 4 test gọi Gemini thật (đánh dấu `@pytest.mark.live`) — CI bỏ qua để khỏi phụ thuộc quota/mạng                                  |
| **Smoke (toàn diện)** | **trên server sau mỗi deploy** (`scripts/smoke.sh`) | health 3 service, API, SEO, phân quyền (401), order-guard, voucher, admin login + cookie, **agent A2A + chat SSE với LLM thật** |

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

| Triệu chứng              | Kiểm tra                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Site 502/521             | `pm2 status` (service chết?) · `systemctl status nginx` · Cloudflare SSL mode = Full            |
| Login không được         | cookie: `be/.env` phải `COOKIE_DOMAIN=.vhdcorp.com` + `NODE_ENV=production`; truy cập qua HTTPS |
| Agent không trả lời      | `pm2 logs vhd-agent` (thiếu GOOGLE_API_KEY / quota?)                                            |
| Deploy fail trên Actions | mở log job → thường do test đỏ (sửa code) hoặc VPS hết RAM lúc build (swap 4GB đã bật)          |
| DB lỗi                   | `systemctl status postgresql` · `sudo -u postgres psql vhdcorp_prod`                            |

## 9. Bảo mật định kỳ

- Đổi mật khẩu root VPS + mật khẩu admin web (mặc định seed) sau bàn giao.
- Backup DB hằng đêm: `crontab -e` → `0 2 * * * sudo -u postgres pg_dump vhdcorp_prod > ~/backup_$(date +\%F).sql`
- (Khuyến nghị Cloudflare) bật security headers: SSL/TLS → Edge → HSTS; Rules → thêm `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
