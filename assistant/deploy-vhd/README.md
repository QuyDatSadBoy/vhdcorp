# Trợ lý nội bộ VHD Corp — cài đặt trên máy chủ

Trợ lý này là bản DeepSeek Harness đã đổi thương hiệu VHD, dùng cho anh em trong công ty.

## Đọc phần này trước khi cài

Tài liệu gốc của DeepSeek Harness ghi rõ:

> *"there is no TLS, auth, or origin policy, so a non-loopback bind exposes the server to that network"*
> — `docs/subsystems/web-server.md`

Nghĩa là: **bản thân nó không có mật khẩu, không có HTTPS**. Mà trợ lý bên trong lại
chạy được lệnh trên máy chủ (`bash`, `run_code`). Ghép hai điều đó lại:

- Nếu mở thẳng ra internet → **ai tìm thấy địa chỉ là chiếm được máy chủ**, không cần
  hack gì cả. Chỉ cần mở trang và bảo trợ lý chạy lệnh.
- Đây không phải lỗ hổng của họ. Công cụ này thiết kế để chạy trên máy của chính người
  dùng, một người một máy. Dùng cho nhiều người là mình đang dùng ngoài mục đích gốc,
  nên phải tự dựng lớp bảo vệ.

Vì vậy cách cài dưới đây có bốn lớp, **không được bỏ lớp nào**:

| Lớp | Chặn điều gì |
|---|---|
| **Đăng nhập trong ứng dụng** | Cửa khoá nằm trong chính chương trình, không phụ thuộc nginx |
| Chạy bằng người dùng riêng, không phải root | Bị chiếm cũng không có quyền root, không đọc được `.env` của web bán hàng |
| Chỉ nghe ở 127.0.0.1 | Không ai vào trực tiếp được, buộc phải qua nginx |
| nginx: HTTPS | Đường truyền được mã hoá |
| Giới hạn bộ nhớ và số tiến trình | Một lệnh sai không làm sập cả máy chủ |

Lớp đầu là phần mình tự viết thêm (`packages/host/webserver/src/vhd-auth.ts`) — bản
gốc không có. Đặt trong ứng dụng chứ không chỉ ở nginx vì **nginx cấu hình sai một
lần là mất luôn máy chủ**; có lớp này thì nginx sai vẫn còn cửa khoá.

## 1. Tạo người dùng riêng

```bash
sudo adduser --system --group --home /opt/vhd-assistant vhdagent
sudo mkdir -p /opt/vhd-assistant && sudo chown -R vhdagent:vhdagent /opt/vhd-assistant
```

Người dùng này **không đăng nhập được** (`--system`) và chỉ thấy thư mục của nó.
Quan trọng: nó KHÔNG được nằm trong nhóm `sudo`, và không đọc được `/root/vhdcorp`
(nơi chứa khoá API và mật khẩu cơ sở dữ liệu của web bán hàng).

## 2. Đưa mã nguồn lên và cài

```bash
sudo -u vhdagent git clone <repo-noi-bo> /opt/vhd-assistant/app
cd /opt/vhd-assistant/app
sudo -u vhdagent corepack enable pnpm
sudo -u vhdagent pnpm install
sudo -u vhdagent pnpm build     # xem package.json để biết lệnh build đúng
```

Khoá API của mô hình đặt trong `/opt/vhd-assistant/.env`, quyền `600`, chủ là `vhdagent`:

```bash
sudo -u vhdagent tee /opt/vhd-assistant/.env >/dev/null <<'EOF'
DEEPSEEK_API_KEY=...
EOF
sudo chmod 600 /opt/vhd-assistant/.env
```

## 3. Chạy như dịch vụ, có giới hạn cứng

Trợ lý chạy được lệnh nên một câu hỏi vô tình cũng có thể sinh tiến trình ăn hết bộ
nhớ. `MemoryMax` là hàng rào cuối: vượt là bị nhân hệ thống dừng, **web bán hàng không
bị ảnh hưởng**.

```ini
# /etc/systemd/system/vhd-assistant.service
[Unit]
Description=Tro ly noi bo VHD Corp
After=network.target

[Service]
Type=simple
User=vhdagent
Group=vhdagent
WorkingDirectory=/opt/vhd-assistant/app
EnvironmentFile=/opt/vhd-assistant/.env

# CHỈ nghe loopback — nginx là cửa duy nhất
ExecStart=/usr/bin/pnpm dsh web --host 127.0.0.1 --port 3080

# Hàng rào tài nguyên: server có 3.8GB, web bán hàng đang dùng ~1.1GB
MemoryMax=900M
MemoryHigh=700M
TasksMax=256
CPUQuota=150%

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

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vhd-assistant
sudo systemctl status vhd-assistant
```

`ProtectSystem=strict` + `ReadWritePaths` nghĩa là dịch vụ chỉ ghi được vào thư mục của
nó. Ngay cả khi ai đó bảo trợ lý xoá file hệ thống, nó cũng không có quyền.

## 4. Cấp tài khoản cho anh em

```bash
export VHD_AUTH_USERS=/opt/vhd-assistant/vhd-users.json
sudo -u vhdagent -E node /opt/vhd-assistant/app/deploy-vhd/vhd-user.mjs add quydat
sudo -u vhdagent -E node .../vhd-user.mjs add nhanvien2
sudo -u vhdagent -E node .../vhd-user.mjs list      # xem ai đang có quyền
sudo -u vhdagent -E node .../vhd-user.mjs del cunhanvien   # người đã nghỉ
```

Mật khẩu nhập tại bàn phím, không hiện ra màn hình và không vào lịch sử lệnh.
Tệp lưu mật khẩu **đã băm** (scrypt, muối riêng từng người) với quyền `600` — đọc
được tệp cũng không suy ra mật khẩu. Yêu cầu tối thiểu 12 ký tự, vì tài khoản này
mở được trợ lý chạy lệnh trên máy chủ.

Thêm vào `/opt/vhd-assistant/.env`:

```
VHD_AUTH_USERS=/opt/vhd-assistant/vhd-users.json
```

> **Không đặt biến này thì ứng dụng chạy KHÔNG CÓ đăng nhập** (giữ đúng hành vi bản
> gốc cho ai dùng một mình trên máy cá nhân). Trên máy chủ thì bắt buộc phải có.
> Đặt biến mà tệp hỏng/rỗng thì dịch vụ **không khởi động** — thà không chạy còn hơn
> chạy mà mở cửa.

Xoá người dùng xong nhớ `sudo systemctl restart vhd-assistant` để cắt phiên đang mở.

Những gì lớp đăng nhập này chặn (có bài kiểm tự động cho từng mục, 15 bài):

- Chưa đăng nhập: mở trang bị đẩy về `/login`, **không tải được tệp nào** của giao diện
- Chưa đăng nhập: gọi API trả 401 (không trộn HTML vào chỗ chờ JSON)
- Chưa đăng nhập: **WebSocket cũng bị chặn** — bỏ sót chỗ này là để lại cửa sau
- Cookie bịa, cookie sau khi đăng xuất: không dùng lại được
- Sai 5 lần → khoá IP 15 phút (chặn dò mật khẩu)
- Tên không tồn tại và sai mật khẩu trả **cùng một thông báo** (không tiết lộ tên nào có thật)
- Không chuyển hướng sang tên miền lạ sau khi đăng nhập
- Cookie `HttpOnly` + `SameSite=Strict` (JS của trang khác không đọc/gửi kèm được)

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

    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_http_version 1.1;

        # Trợ lý dùng WebSocket để đẩy tiến trình về — thiếu hai dòng này là mất kết nối
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Trợ lý làm việc dài (đọc mã, chạy lệnh) — timeout ngắn sẽ cắt giữa việc
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_buffering     off;   # tiến trình hiện dần, không dồn một cục
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vhd-assistant /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d assistant.vhdcorp.com
```

> Lưu file sao lưu cấu hình nginx **ngoài** `sites-enabled/` — nginx nạp mọi file trong
> đó, kể cả `.bak`, và hai file cùng `server_name` sẽ xung đột.

## 6. Kiểm tra sau khi cài

```bash
# 1. Chỉ nghe loopback — PHẢI thấy 127.0.0.1, KHÔNG được thấy 0.0.0.0
sudo ss -ltnp | grep 3080

# 2. Chưa đăng nhập → phải bị đẩy về /login (302), KHÔNG được ra 200
curl -o /dev/null -w '%{http_code}\n' https://assistant.vhdcorp.com

# 3. Đăng nhập sai → 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -d 'username=quydat&password=sai' https://assistant.vhdcorp.com/auth/login

# 4. Vào thẳng cổng 3080 từ ngoài → phải KHÔNG kết nối được
curl --max-time 5 http://IP_MÁY_CHỦ:3080

# 5. Giới hạn bộ nhớ đã áp
systemctl show vhd-assistant -p MemoryMax -p TasksMax
```

Nếu bước 1 thấy `0.0.0.0` hoặc bước 4 kết nối được thì **dừng ngay** và sửa, vì lúc đó
máy chủ đang mở cho bất kỳ ai.

## Vận hành

```bash
sudo systemctl restart vhd-assistant     # khởi động lại
sudo journalctl -u vhd-assistant -f      # xem log
systemctl show vhd-assistant -p MemoryCurrent   # đang dùng bao nhiêu bộ nhớ
sudo -u vhdagent -E node /opt/vhd-assistant/app/deploy-vhd/vhd-user.mjs add tennguoimoi
sudo -u vhdagent -E node /opt/vhd-assistant/app/deploy-vhd/vhd-user.mjs del tennghiviec
```

## Điều cần biết khi cho nhiều người dùng chung

Mỗi người đăng nhập bằng tài khoản riêng, nhưng **quyền thì chung**: ai cũng đọc/ghi được file
trong `/opt/vhd-assistant`, và thấy được lịch sử của nhau. Đây không phải hệ thống nhiều
người dùng tách biệt — nó là một máy làm việc dùng chung.

Vì vậy: chỉ cấp mật khẩu cho người mình tin, và **đừng để dữ liệu riêng tư của khách
hàng vào thư mục đó**.
