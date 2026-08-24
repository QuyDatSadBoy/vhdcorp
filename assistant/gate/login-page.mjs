/**
 * Trang đăng nhập của trợ lý nội bộ.
 *
 * Tự chứa hoàn toàn (CSS nội tuyến, không tải tệp ngoài): người chưa đăng nhập
 * không được tải BẤT KỲ tệp nào của ứng dụng trợ lý, kể cả bundle JavaScript.
 */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  })
}

export function loginPage({ error, next = '/', email = '' } = {}) {
  const msg = error ? `<p class="err" role="alert">${escapeHtml(error)}</p>` : ''
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Đăng nhập · Trợ lý nội bộ VHD Corp</title>
<style>
  :root{--vhd:#1b3a8c;--vhd-2:#4fb8e7;--bg:#f4f7fb;--card:#fff;--fg:#0f1729;
    --muted:#5b6780;--line:#dae1ec;--err-fg:#b42318;--err-bg:#fef3f2;--err-line:#fda29b}
  :root:not([data-theme=light]){@media(prefers-color-scheme:dark){
    --bg:#0b1017;--card:#121926;--fg:#e6edf6;--muted:#93a0b8;--line:#273246;
    --err-fg:#fda29b;--err-bg:#2c1416;--err-line:#7a271a}}
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;
    background:var(--bg);color:var(--fg);
    font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  form{width:100%;max-width:372px;background:var(--card);border:1px solid var(--line);
    border-radius:18px;padding:30px 28px 26px;
    box-shadow:0 1px 2px rgb(15 23 41/.04),0 12px 32px -12px rgb(15 23 41/.14)}
  .brand{display:flex;align-items:center;gap:11px;margin-bottom:6px}
  .mark{width:36px;height:36px;border-radius:10px;flex:none;color:#fff;
    background:linear-gradient(135deg,var(--vhd),var(--vhd-2));
    display:grid;place-items:center;font-weight:800;font-size:12.5px;letter-spacing:.5px}
  h1{font-size:17px;margin:0;font-weight:640;letter-spacing:-.01em}
  .sub{font-size:13px;color:var(--muted);margin:1px 0 0}
  .hint{font-size:12.5px;color:var(--muted);margin:14px 0 0}
  label{display:block;font-size:13px;font-weight:600;margin:16px 0 6px}
  input{width:100%;padding:11px 12px;font-size:16px;color:var(--fg);background:var(--bg);
    border:1px solid var(--line);border-radius:10px;font-family:inherit}
  input:focus-visible{outline:2px solid var(--vhd-2);outline-offset:1px;border-color:var(--vhd-2)}
  button{width:100%;margin-top:22px;padding:12px;font-size:15px;font-weight:640;color:#fff;
    background:var(--vhd);border:0;border-radius:10px;cursor:pointer;font-family:inherit}
  button:hover{background:color-mix(in srgb,var(--vhd) 88%,#000)}
  button:focus-visible{outline:2px solid var(--vhd-2);outline-offset:2px}
  .err{margin:16px 0 0;padding:10px 12px;font-size:13px;border-radius:10px;
    color:var(--err-fg);background:var(--err-bg);border:1px solid var(--err-line)}
  @media(prefers-reduced-motion:no-preference){
    form{animation:up .28s cubic-bezier(.2,.7,.3,1) both}
    @keyframes up{from{opacity:0;transform:translateY(6px)}}}
</style></head><body>
<form method="post" action="/auth/login">
  <div class="brand"><span class="mark">VHD</span>
    <div><h1>Trợ lý nội bộ</h1><p class="sub">VHD Corp</p></div></div>
  <p class="hint">Đăng nhập bằng tài khoản quản trị vhdcorp.com của bạn.</p>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <label for="e">Email</label>
  <input id="e" name="email" type="email" value="${escapeHtml(email)}"
         autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
  <label for="p">Mật khẩu</label>
  <input id="p" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Đăng nhập</button>
  ${msg}
</form></body></html>`
}

/** Trang báo máy chủ đang đủ người — nói rõ phải làm gì, không để người dùng đoán. */
export function busyPage(activeCount) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Máy chủ đang đủ người · Trợ lý nội bộ VHD</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;
    background:#f4f7fb;color:#0f1729;font:16px/1.6 system-ui,sans-serif;text-align:center}
  @media(prefers-color-scheme:dark){body{background:#0b1017;color:#e6edf6}}
  div{max-width:420px}
  h1{font-size:18px;margin:0 0 8px}
  p{margin:0;font-size:14px;opacity:.75}
</style></head><body><div>
  <h1>Máy chủ đang phục vụ tối đa ${activeCount} người</h1>
  <p>Trợ lý chạy được lệnh nên mỗi người cần một tiến trình riêng, và máy chủ chỉ
  đủ RAM cho ${activeCount} người cùng lúc. Chờ vài phút rồi tải lại trang —
  tiến trình của người đang rảnh sẽ tự nhường chỗ.</p>
</div></body></html>`
}

/**
 * Trang chờ trong lúc tiến trình trợ lý của người này bật lên (~30-60s lần đầu).
 *
 * Không để màn hình trắng: người dùng không biết đang chờ gì thì sẽ bấm tải lại
 * liên tục, mỗi lần lại tưởng hỏng. Trang này tự kiểm và tự vào khi xong.
 */
export function startingPage() {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Đang mở trợ lý…</title>
<style>
  :root{--vhd:#1b3a8c;--vhd-2:#4fb8e7;--bg:#f4f7fb;--fg:#0f1729;--muted:#5b6780}
  @media(prefers-color-scheme:dark){:root{--bg:#0b1017;--fg:#e6edf6;--muted:#93a0b8}}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;
    background:var(--bg);color:var(--fg);text-align:center;
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .mark{width:40px;height:40px;border-radius:11px;margin:0 auto 18px;color:#fff;
    background:linear-gradient(135deg,var(--vhd),var(--vhd-2));
    display:grid;place-items:center;font-weight:800;font-size:13px;letter-spacing:.5px}
  h1{font-size:17px;margin:0 0 6px;font-weight:640}
  p{margin:0;font-size:13.5px;color:var(--muted);max-width:330px}
  .bar{width:180px;height:3px;margin:20px auto 0;border-radius:3px;overflow:hidden;
    background:color-mix(in srgb,var(--muted) 25%,transparent)}
  .bar i{display:block;height:100%;width:40%;border-radius:3px;
    background:linear-gradient(90deg,var(--vhd),var(--vhd-2))}
  @media(prefers-reduced-motion:no-preference){
    .bar i{animation:slide 1.1s ease-in-out infinite}
    @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}}
  @media(prefers-reduced-motion:reduce){.bar i{width:100%}}
</style></head><body><div>
  <div class="mark">VHD</div>
  <h1>Đang mở trợ lý của bạn</h1>
  <p>Lần đầu vào trong ngày mất khoảng nửa phút — trợ lý của bạn chạy riêng
  một tiến trình nên phải bật lên trước. Trang tự vào khi xong.</p>
  <div class="bar"><i></i></div>
</div>
<script>
  // Tự kiểm thay vì bắt người dùng bấm tải lại. Dùng HEAD cho nhẹ; khi cổng vào
  // không còn trả 202 nữa là trợ lý đã sẵn sàng.
  (function poll(){
    setTimeout(function(){
      fetch(location.href,{method:'HEAD',headers:{'x-vhd-probe':'1'}})
        .then(function(r){ if(r.status!==202){ location.reload(); return; } poll() })
        .catch(poll)
    },1500)
  })()
</script></body></html>`
}
