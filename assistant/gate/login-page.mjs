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

/** Logo VHD Corp nhúng thẳng vào trang (PNG 128x128, lấy từ vhdcorp.com). */
const VHD_LOGO = 'data:image/png;base64,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'

/**
 * CSS dùng chung cho mọi trang của cổng vào.
 *
 * Hình ảnh lấy từ chính sản phẩm của VHD: gioăng bích là tấm vuông có lỗ bắt
 * bu-lông ở góc. Nên các trang này là một BIỂN TÊN gắn trên thiết bị — logo lớn
 * đặt trên vòng gioăng, bốn lỗ bu-lông mờ ở bốn góc. Đó là điểm nhấn duy nhất;
 * mọi thứ còn lại giữ yên tĩnh.
 *
 * Không tải phông chữ ngoài: trang đăng nhập phải hiện tức thì và không được gọi
 * ra mạng trước khi người dùng được xác thực.
 */
const SHARED_CSS = `
  :root{
    --ink:#0e1a33; --muted:#5b6780; --vhd:#1b3a8c; --sky:#4fb8e7;
    --field:#eef1f6; --card:#fff; --rule:#cdd6e4; --bolt:#c3ccdb;
    --err-fg:#a4231b; --err-bg:#fdf1f0; --err-rule:#f0b6b1;
  }
  @media(prefers-color-scheme:dark){
    :root:not([data-theme=light]){
      --ink:#e8eef8; --muted:#93a2bb; --vhd:#4a72d0; --sky:#4fb8e7;
      --field:#0d1322; --card:#131a2a; --rule:#28324a; --bolt:#2b3550;
      --err-fg:#f4a9a2; --err-bg:#261414; --err-rule:#6d2620;
    }
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    margin:0; min-height:100dvh; display:grid; place-items:center; padding:20px;
    background:var(--field); color:var(--ink);
    font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  }

  /* Biển tên: tấm gioăng có lỗ bu-lông ở bốn góc */
  .plate{
    position:relative; width:100%; max-width:392px;
    background:var(--card); border:1px solid var(--rule); border-radius:14px;
    padding:38px 34px 30px;
    box-shadow:0 1px 1px rgb(14 26 51/.04), 0 14px 40px -22px rgb(14 26 51/.30);
  }
  .plate::before,.plate::after,.bolts::before,.bolts::after{
    content:""; position:absolute; width:5px; height:5px; border-radius:50%;
    background:var(--bolt);
  }
  .plate::before{top:11px;left:11px} .plate::after{top:11px;right:11px}
  .bolts::before{bottom:11px;left:11px} .bolts::after{bottom:11px;right:11px}

  /* Logo đặt trên vòng gioăng */
  .mark{
    width:88px; height:88px; margin:0 auto 20px; display:grid; place-items:center;
    border-radius:50%; border:1px solid var(--rule);
    box-shadow:inset 0 0 0 7px var(--field);
  }
  .mark img{width:56px;height:56px;border-radius:12px;display:block}

  .ident{text-align:center;margin-bottom:6px}
  .ident h1{
    margin:0; font-size:21px; font-weight:680; letter-spacing:-.022em; line-height:1.2;
  }
  .ident p{
    margin:6px 0 0; font-size:10.5px; font-weight:620; color:var(--muted);
    text-transform:uppercase; letter-spacing:.16em;
  }
  .note{
    margin:16px 0 0; padding-top:16px; border-top:1px solid var(--rule);
    font-size:12.5px; color:var(--muted); text-align:center;
  }

  label{display:block;font-size:12.5px;font-weight:640;margin:16px 0 6px}
  input{
    width:100%; padding:11px 12px; font-size:16px; font-family:inherit;
    color:var(--ink); background:var(--field);
    border:1px solid var(--rule); border-radius:9px;
  }
  input:focus-visible{
    outline:2px solid var(--sky); outline-offset:1px; border-color:var(--sky);
  }
  button{
    width:100%; margin-top:22px; padding:12px; font:inherit; font-size:15px;
    font-weight:660; letter-spacing:.01em; color:#fff; background:var(--vhd);
    border:0; border-radius:9px; cursor:pointer;
  }
  button:hover{background:color-mix(in srgb,var(--vhd) 87%,#000)}
  button:focus-visible{outline:2px solid var(--sky);outline-offset:2px}
  .err{
    margin:16px 0 0; padding:10px 12px; font-size:12.5px; border-radius:9px;
    color:var(--err-fg); background:var(--err-bg); border:1px solid var(--err-rule);
  }
  @media(prefers-reduced-motion:no-preference){
    .plate{animation:mount .26s cubic-bezier(.2,.7,.3,1) both}
    @keyframes mount{from{opacity:0;transform:translateY(8px)}}
  }
  @media(max-width:380px){
    .plate{padding:30px 22px 24px}
    .mark{width:76px;height:76px}
    .mark img{width:48px;height:48px}
  }
`

/** Khối logo + tên dùng chung cho mọi trang. */
function identity(title, sub) {
  return `<div class="mark"><img src="${VHD_LOGO}" alt="" aria-hidden="true"></div>
  <div class="ident"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(sub)}</p></div>`
}

function shell(title, bodyHtml) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
<style>${SHARED_CSS}</style></head>
<body>${bodyHtml}</body></html>`
}

export function loginPage({ error, next = '/', email = '' } = {}) {
  const msg = error ? `<p class="err" role="alert">${escapeHtml(error)}</p>` : ''
  return shell('Đăng nhập · Trợ lý nội bộ VHD Corp', `
<form class="plate" method="post" action="/auth/login">
  <span class="bolts"></span>
  ${identity('Trợ lý nội bộ', 'VHD Corp')}
  <p class="note">Đăng nhập bằng tài khoản quản trị vhdcorp.com của bạn.</p>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <label for="e">Email</label>
  <input id="e" name="email" type="email" value="${escapeHtml(email)}"
         autocomplete="username" autocapitalize="none" spellcheck="false"
         inputmode="email" required autofocus>
  <label for="p">Mật khẩu</label>
  <input id="p" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Đăng nhập</button>
  ${msg}
</form>`)
}

/**
 * Trang báo máy chủ đang đủ người — nói rõ vì sao và phải làm gì, không để người
 * dùng đoán rồi bấm tải lại liên tục.
 */
export function busyPage(activeCount) {
  return shell('Máy chủ đang đủ người · Trợ lý nội bộ VHD', `
<div class="plate">
  <span class="bolts"></span>
  ${identity('Đang đủ người', 'VHD Corp')}
  <p class="note">Máy chủ chỉ đủ bộ nhớ cho ${activeCount} người dùng trợ lý cùng lúc,
  vì mỗi người chạy một tiến trình riêng. Chờ vài phút rồi tải lại — người đang
  rảnh sẽ tự nhường chỗ.</p>
</div>`)
}

/**
 * Trang chờ trong lúc tiến trình trợ lý của người này bật lên (~5s).
 *
 * Không để màn hình trắng: người dùng không biết đang chờ gì thì sẽ bấm tải lại
 * liên tục, mỗi lần lại tưởng hỏng. Trang này tự kiểm và tự vào khi xong.
 */
export function startingPage() {
  return shell('Đang mở trợ lý…', `
<div class="plate">
  <span class="bolts"></span>
  ${identity('Đang mở trợ lý', 'VHD Corp')}
  <p class="note">Trợ lý của bạn chạy riêng một tiến trình nên phải bật lên trước.
  Trang tự vào khi xong.</p>
  <div class="bar" role="progressbar" aria-label="Đang mở trợ lý"><i></i></div>
</div>
<style>
  .bar{width:150px;height:3px;margin:20px auto 2px;border-radius:3px;overflow:hidden;
    background:color-mix(in srgb,var(--muted) 22%,transparent)}
  .bar i{display:block;height:100%;width:42%;border-radius:3px;
    background:linear-gradient(90deg,var(--vhd),var(--sky))}
  @media(prefers-reduced-motion:no-preference){
    .bar i{animation:slide 1.05s ease-in-out infinite}
    @keyframes slide{0%{transform:translateX(-105%)}100%{transform:translateX(245%)}}}
  @media(prefers-reduced-motion:reduce){.bar i{width:100%}}
</style>
<script>
  // Tự kiểm thay vì bắt người dùng bấm tải lại. HEAD cho nhẹ; cổng vào trả 202
  // khi còn đang bật, khác 202 là đã sẵn sàng.
  (function poll(){
    setTimeout(function(){
      fetch(location.href,{method:'HEAD',headers:{'x-vhd-probe':'1'}})
        .then(function(r){ if(r.status!==202){ location.reload(); return } poll() })
        .catch(poll)
    },1200)
  })()
</script>`)
}
