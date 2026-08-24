# Trợ lý nội bộ VHD Corp — cài đặt trên máy chủ

Bản DeepSeek Harness đổi thương hiệu VHD, dùng cho anh em trong công ty.

## Đọc phần này trước khi cài

Tài liệu gốc của DeepSeek Harness ghi rõ:

> *"there is no TLS, auth, or origin policy, so a non-loopback bind exposes the server to that network"*
> — `docs/subsystems/web-server.md`

Nghĩa là **bản thân nó không có mật khẩu**. Mà trợ lý bên trong lại chạy được lệnh
trên máy chủ (`bash`, `run_code`). Ghép hai điều đó lại: mở thẳng ra internet là
**ai tìm thấy địa chỉ cũng chiếm được máy chủ**, không cần hack gì — chỉ cần mở
trang rồi bảo trợ lý chạy lệnh.

Đây không phải lỗi của họ. Công cụ này thiết kế cho một người trên máy của chính
mình. Dùng cho nhiều người là mình đang dùng ngoài mục đích gốc, nên phải tự dựng
lớp bảo vệ. **Mã của trợ lý giữ nguyên không sửa** — toàn bộ sức mạnh còn đủ; phần
bảo vệ nằm ở một cổng vào đứng trước nó.

## Cách chạy

```
Người dùng ──HTTPS──▶ nginx ──▶ CỔNG VÀO (gate) ──▶ trợ lý riêng của người đó
                                     │                (mỗi nick 1 tiến trình,
                                     │                 1 thư mục home riêng)
                                     └─ chưa đăng nhập thì chỉ thấy trang đăng nhập
```

| Lớp | Chặn điều gì |
|---|---|
| Cổng vào đòi đăng nhập | Chưa đăng nhập thì **không tải được tệp nào** của trợ lý |
| Xác thực bằng tài khoản quản trị vhdcorp.com | Thêm/xoá người chỉ làm ở trang admin, một chỗ duy nhất |
| Mỗi nick một tiến trình + home riêng | Anh em **không đọc được file của nhau** |
| Mọi thứ chỉ nghe 127.0.0.1 | nginx là cửa duy nhất từ ngoài vào |
| Chạy bằng người dùng hệ thống riêng, không phải root | Bị chiếm cũng không đọc được `.env` của web bán hàng |
| Trần số người cùng lúc + tự tắt khi rảnh | Máy chủ 3.8GB RAM không bị tràn |

### Vì sao mỗi nick một tiến trình riêng

Mỗi người có tiến trình riêng, `DSH_HOME` riêng (lịch sử chat, cấu hình, hồ sơ
không lẫn nhau), và tiến trình được bật **ngay trong thư mục workspace của họ** —
DSH lấy thư mục làm việc mặc định và biên giới ghi của sandbox từ `process.cwd()`,
nên mở trợ lý lên là đã ở đúng chỗ, không phải tự chọn.

**Điều còn lại phải nói thật:** các tiến trình đều chạy dưới cùng một người dùng hệ
thống (`vhdagent`), nên nếu ai chủ động gõ đường dẫn sang `homes/<người khác>/` thì
**vẫn đọc được file của đồng nghiệp**. Sandbox của DeepSeek Harness chỉ chắn **ghi**,
không chắn **đọc** (`FS_SANDBOX_DENIED` chỉ áp cho write/edit).

Với anh em trong cùng công ty thì mức này thường là đủ. Nếu cần chặn hẳn cả việc
đọc chéo, có hai đường:

1. **Landlock** — DeepSeek Harness có sẵn launcher `landlock-run` (tự khoá rồi
   `exec`, ruleset kế thừa qua `execve` nên khoá cả tiến trình con, fail-closed).
   Gói nền tảng không được cài mặc định; cài
   `@deepseek-ai/node-addon-landlock-run-linux-x64` rồi bọc lệnh spawn trong
   `gate/instances.mjs` bằng `landlock-run --rw <workspace của người đó> -- <lệnh>`.
2. **Mỗi người một người dùng hệ thống** — cách chắc nhất, nhưng cổng vào phải có
   quyền spawn dưới uid khác (một unit systemd theo mẫu `@user`), phức tạp hơn.

Cái giá là RAM: mỗi người đang dùng chiếm một tiến trình. Nên cổng vào chỉ bật khi
có người vào, **tự tắt sau 20 phút không ai dùng**, và có trần số người cùng lúc —
người vào sau đẩy người rảnh lâu nhất ra.

Lần đầu vào, người dùng thấy **trang chờ có thanh tiến trình** (~5s) rồi tự vào —
không phải màn hình trắng.

## 1. Tạo người dùng hệ thống riêng

```bash
sudo adduser --system --group --home /opt/vhd-assistant vhdagent
sudo mkdir -p /opt/vhd-assistant/homes
sudo chown -R vhdagent:vhdagent /opt/vhd-assistant
sudo chmod 700 /opt/vhd-assistant/homes
```

Người dùng này **không đăng nhập được** (`--system`), không ở trong nhóm `sudo`, và
không đọc được `/root/vhdcorp` (nơi chứa khoá API, mật khẩu cơ sở dữ liệu của web
bán hàng).

## 2. Đưa mã lên và cài

Mã nằm trong repo chính, thư mục `assistant/`:

```bash
sudo -u vhdagent git clone <repo> /opt/vhd-assistant/repo
cd /opt/vhd-assistant/repo/assistant
sudo -u vhdagent corepack enable pnpm
sudo -u vhdagent pnpm install --frozen-lockfile
sudo -u vhdagent pnpm build
```

`--frozen-lockfile` để máy chủ cài ra **đúng phiên bản như máy lập trình**.

Khoá API của mô hình đặt trong `/opt/vhd-assistant/.env`, quyền `600`:

```bash
sudo -u vhdagent tee /opt/vhd-assistant/.env >/dev/null <<'EOF'
DEEPSEEK_API_KEY=...

# Cổng vào
VHD_GATE_PORT=4400
VHD_BE_URL=http://127.0.0.1:3001
VHD_HOMES=/opt/vhd-assistant/homes
VHD_MAX_ACTIVE=4
VHD_IDLE_MINUTES=20
VHD_DSH_COMMAND=node apps/cli/lib/bin.js web
VHD_DSH_CWD=/opt/vhd-assistant/repo/assistant
EOF
sudo chmod 600 /opt/vhd-assistant/.env
```

**Số đo thật** (trên máy lập trình, một người đang dùng):

| Cách chạy trợ lý | RAM/người | Bật lên mất |
|---|---|---|
| `node apps/cli/lib/bin.js web` ← đang dùng | **168MB** | **~5s** |
| `pnpm dsh web` | 388MB | ~22s |

Lớp bọc `pnpm` tốn thêm 150MB mỗi người và làm bật lên chậm gấp 4 lần, nên gọi
thẳng bin đã build. Vì vậy **phải `pnpm build` trước** — thiếu `apps/cli/lib/bin.js`
là trợ lý không bật được.

**Đo với 4 người vào cùng lúc** (`VHD_MAX_ACTIVE=4`):

| Chỉ số | Kết quả |
|---|---|
| Số tiến trình | đúng 4, khớp bảng theo dõi |
| RAM cả 4 cộng lại | **659MB** (~165MB/người) |
| Bốn người cùng bật lên | 23s (một người: ~5s) |
| Người thứ 5 vào | vẫn 4 tiến trình — người rảnh lâu nhất nhường chỗ |
| Sau khi tắt cổng vào | **0 tiến trình còn sót** |

Máy chủ 3.8GB, web bán hàng đang dùng ~1.1GB → 4 người ≈ 660MB, còn dư nhiều.
Tăng trần chỉ khi đã thêm RAM.

## 3. Cấp quyền dùng cho anh em

**Không có danh sách người dùng riêng.** Ai đăng nhập được trang quản trị
vhdcorp.com thì đăng nhập được trợ lý — cổng vào gọi thẳng
`POST /api/auth/admin/login` của BE để kiểm tra.

Thêm người: tạo tài khoản quản trị trong trang admin.
Cắt quyền: khoá tài khoản đó trong trang admin, rồi
`sudo systemctl restart vhd-gate` để cắt phiên đang mở.

## 4. Chạy như dịch vụ, có giới hạn cứng

Chỉ chạy **một** dịch vụ: cổng vào. Nó tự bật/tắt các tiến trình trợ lý con.

```ini
# /etc/systemd/system/vhd-gate.service
[Unit]
Description=Cong vao tro ly noi bo VHD Corp
After=network.target

[Service]
Type=simple
User=vhdagent
Group=vhdagent
WorkingDirectory=/opt/vhd-assistant/repo/assistant/gate
EnvironmentFile=/opt/vhd-assistant/.env
ExecStart=/usr/bin/node gate.mjs

# Hàng rào tài nguyên tính CẢ tiến trình con: trợ lý chạy được lệnh nên một câu
# hỏi vô tình cũng có thể sinh tiến trình ăn hết bộ nhớ. Vượt là bị nhân hệ thống
# dừng, web bán hàng KHÔNG bị ảnh hưởng.
MemoryMax=1400M
MemoryHigh=1100M
TasksMax=512
CPUQuota=200%

# Bịt các lối leo thang quyền thường gặp
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/vhd-assistant
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RemoveIPC=true

Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vhd-gate
sudo systemctl status vhd-gate
```

- `ProtectSystem=strict` + `ReadWritePaths`: chỉ ghi được vào thư mục của nó. Ai bảo
  trợ lý xoá file hệ thống cũng không có quyền.
- `ProtectHome=true`: chặn `/root` và `/home` → không đọc được `.env` của web bán hàng.
- `KillMode=control-group`: tắt dịch vụ là tắt sạch cả tiến trình trợ lý con, không
  để tiến trình mồ côi giữ RAM.

## 5. Subdomain + HTTPS

Trỏ DNS `assistant.vhdcorp.com` về IP máy chủ (bản ghi A), rồi:

```nginx
# /etc/nginx/sites-available/vhd-assistant
server {
    listen 80;
    server_name assistant.vhdcorp.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name assistant.vhdcorp.com;

    ssl_certificate     /etc/letsencrypt/live/assistant.vhdcorp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assistant.vhdcorp.com/privkey.pem;

    # Không cho công cụ tìm kiếm ghi nhận trang này
    add_header X-Robots-Tag "noindex, nofollow" always;

    # Tệp người dùng gửi lên cho trợ lý đọc
    client_max_body_size 25m;

    location / {
        # Toàn bộ subdomain vào CỔNG VÀO. Cổng vào tự quyết: chưa đăng nhập thì
        # trả trang đăng nhập, đăng nhập rồi thì chuyển vào trợ lý của người đó.
        proxy_pass http://127.0.0.1:4400;
        proxy_http_version 1.1;

        # Trợ lý đẩy tiến trình về bằng WebSocket — thiếu hai dòng này là mất kết nối
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Trợ lý làm việc dài (đọc mã, chạy lệnh) — timeout ngắn sẽ cắt giữa việc.
        # Lần đầu một người vào còn phải chờ tiến trình riêng của họ bật lên.
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_connect_timeout 120s;
        proxy_buffering     off;   # tiến trình hiện dần, không dồn một cục
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vhd-assistant /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d assistant.vhdcorp.com
```

> Lưu bản sao cấu hình nginx **ngoài** `sites-enabled/` — nginx nạp mọi tệp trong đó,
> kể cả `.bak`, và hai tệp cùng `server_name` sẽ xung đột.

## 6. Kiểm tra sau khi cài

```bash
# 1. Chỉ nghe loopback — PHẢI thấy 127.0.0.1, KHÔNG được thấy 0.0.0.0
sudo ss -ltnp | grep 4400

# 2. Chưa đăng nhập → phải bị đẩy về /login (302), KHÔNG được ra 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: text/html' \
  https://assistant.vhdcorp.com

# 3. Đăng nhập sai → 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -d 'email=admin@vhdcorp.com&password=sai' \
  https://assistant.vhdcorp.com/auth/login

# 4. Vào thẳng cổng 4400 từ ngoài → phải KHÔNG kết nối được
curl --max-time 5 http://IP_MÁY_CHỦ:4400

# 5. Giới hạn tài nguyên đã áp
systemctl show vhd-gate -p MemoryMax -p TasksMax -p KillMode
```

Bước 1 thấy `0.0.0.0`, hoặc bước 2 ra 200, hoặc bước 4 kết nối được thì **dừng ngay
và sửa** — lúc đó máy chủ đang mở cho bất kỳ ai.

## Vận hành

```bash
sudo systemctl restart vhd-gate            # khởi động lại (cắt mọi phiên)
sudo journalctl -u vhd-gate -f             # xem log: ai đăng nhập, tiến trình nào bật/tắt
systemctl show vhd-gate -p MemoryCurrent   # đang dùng bao nhiêu RAM
sudo du -sh /opt/vhd-assistant/homes/*     # thư mục của ai đang chiếm bao nhiêu đĩa
```

## Dọn rác tự động

Cổng vào tự dọn phần tốn RAM: mỗi phút kiểm một lượt, tiến trình rảnh quá
`VHD_IDLE_MINUTES` là tắt.

Phần tốn đĩa thì thêm một hẹn giờ. **Chỉ dọn rác của hệ thống, không xoá file của
anh em** — file trong `workspace/` là việc của họ:

```ini
# /etc/systemd/system/vhd-assistant-gc.service
[Unit]
Description=Don rac tro ly noi bo VHD

[Service]
Type=oneshot
User=vhdagent
ExecStart=/usr/bin/find /opt/vhd-assistant/homes -mindepth 2 -maxdepth 3 \
  \( -name 'logs' -o -name 'cache' -o -name 'tmp' \) -type d \
  -exec find {} -type f -mtime +14 -delete \;
```

```ini
# /etc/systemd/system/vhd-assistant-gc.timer
[Unit]
Description=Don rac tro ly noi bo VHD hang ngay

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now vhd-assistant-gc.timer
sudo systemctl start vhd-assistant-gc.service   # chạy thử một lần
```

`PrivateTmp=true` ở dịch vụ chính đã lo phần `/tmp`: tắt dịch vụ là mất sạch.

## Điều cần biết khi cho nhiều người dùng chung

- **Trợ lý giữ đủ quyền của bản gốc** trong thư mục của từng người: chạy lệnh, đọc
  ghi file, gọi mạng. Đó là chủ ý — anh em cần làm được việc.
- Vì vậy **chỉ cấp tài khoản quản trị cho người mình tin**. Ai vào được trợ lý thì
  chạy được lệnh dưới quyền `vhdagent`.
- Anh em **đọc được file của nhau** nếu chủ động đi tìm (xem mục trên). Đừng để dữ
  liệu riêng tư của khách hàng vào `homes/`.

## Những gì có bài kiểm tự động

20 bài trong `gate/tests/gate.test.mjs`, bật cổng vào thật và gọi HTTP/WebSocket
thật (`node --test gate/tests/gate.test.mjs`):

- Chưa đăng nhập: trang bị đẩy về `/login`, API trả 401, **WebSocket bị chặn**
- Trang đăng nhập tự chứa — chưa đăng nhập không tải được tệp nào của trợ lý
- Sai mật khẩu 401; sai 5 lần khoá IP 15 phút; lần 6 đúng mật khẩu vẫn 429
- BE chết → 503 báo hệ thống lỗi, **không** tính là đăng nhập sai
- Cookie bịa, cookie sau khi đăng xuất: không dùng lại được
- Không chuyển hướng ra tên miền lạ; `GET /auth/login` trả 405
- Mỗi người vào đúng `DSH_HOME`, workspace, và `cwd` của mình
- Tên có ký tự lạ (`../../etc/passwd`) không thoát ra khỏi thư mục home
- Nhiều request cùng lúc của một người chỉ sinh **một** tiến trình (đếm bằng
  `pgrep`, không tin bảng theo dõi)
- Bật không lên thì không để lại tiến trình mồ côi, và thử lại được
- Rảnh quá lâu tự tắt; quá trần thì người rảnh lâu nhất nhường chỗ
