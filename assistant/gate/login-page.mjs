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
const VHD_LOGO = 'data:image/png;base64,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4H9k5uflTJ8JtZfCImK2DBkKBYr6hMePyzrumPxJEwQAzSCgN4vjDlh1NAOkvHbd+IEIFIicKfgHAva8a6S4h8/fSzBCqwNQHtrDAHR23NzrpuKdiZL9rcbdpdb3S+sldtGU3H1Ptr1fyczkd23UGv52Gnvi+p5NxfQMAP47cbem0N1h6Pq06ycAZkUkuh7d/aNdgNxFSnc/p9vddnoBn87+X/yPdrmq64m7P1prLYTYsW9Gt0d056p9vPZBcMT8N6DO0dbWlk6nu772Lj+11tXV1UQSnYvoup/geV5bW1vXbXceu86qrl93eQEhqIs0otMMSqfT8Xi864m7PNp13YaGBsdx/KZ91G2pQPeXYeaampquX3sqKifvuuuur3J9LBYzTbO1tTUej7/xxhtlZWWmaabT6dbW1mg0GovFbNuOx+Omaa5atWrhwoXDhg1TShmGIaVsbGysra2NRqMtLS2BQGDlypUNDQ39+vVraWmpq6tra2vzPK+xsTGZTGZlZfnndLF8e3u7Ukop5TiO1nrbtm2e5zU1NTU0NAQCAcuy6uvrm5qampqagsHg0qVLmbmgoGDr1q2u64bD4Vgs5rqulLKlpaW8vHzZsmWmacZisWg0mkwmmdl13S1btuTm5hJRPB6vrKyMRCJVVVWvv/66UioSiViW1dbWJqX8iqHvf94KUkpJKRcuXMjM6XTaNM1t27YdffTRlZWVb7755oknnjho0KCHH364f//+2dnZnudt3749kUhUVlauXLnysssuq6ure+aZZ3Jzc+vr61euXHnddde9/vrrU6dOBdDa2jp//vxgMDhmzJi1a9dmZWX16dOnra3t8ssv7+K79957r6ioKBgMrl+/3nXdxsZGH9dwOJxIJC655JLq6upnnnlm4MCBX/va11577bUbb7xx1apVixcvFkJcfPHFtbW1K1asmDZt2vPPP9+/f/+5c+fef//9jY2NY8aMOeyww5qbm5ubmx3Hqa6unjFjxosvvlhfX19cXJydnd3Y2JhKpe6+++7TTz9969at06dPHzhw4FeRRV9VBAkhHnzwweOPP76wsBBASUnJrFmzhg4devrppwOIRqMrV64sLS3dsGHD2LFjr7vuug8//BBAIBBYs2bNqFGjJk6c6M+SrVu3KqU2b96stR4yZMixxx47derU8ePHJxIJZg4EAq7rAli/fv27774LwLKst99+e9GiRdXV1Y7j3HzzzZZlhUIhwzA8z1NKHXnkkaNHjz7zzDObmpoArF27duXKleecc84tt9xiWdbIkSOTyeS77747ceJE13WVUvn5+bNnz16/fv2KFSuqq6tDodDs2bNTqZT/NbOzs5VSqVTKMIx+/foVFRW9995727dvtyzrIOuA9vb2M844Y/HixVVVVbZtt7e3p1KpRCKRTCYBuK47d+7cVatWDRo0aMOGDS+99NKQIUMymUwmkxk4cGBpaelHH320adMmKeWiRYtycnKqq6vXrVvHzG1tbe3t7YlEIhAIeJ4XDHYsWYlGo8XFxQASicTRRx89ZcqUUCiklHrjjTcikQgzh0Khq666Kj8/n5nb29tbW1sXLVrUv3//1atXA1iyZMn8+fObm5tN08zJyVmxYsUxxxzT1NS0aNGi7Ozs9vb2OXPmlJaW5uTktLa2Ll682L8qmUxqrZPJpC9v4/G4YRgnnnjiypUrTdM8aFaQP+/Ky8uLioqqqqocx6mvr49EIpMmTdq0adPw4cMNw9i0adOgQYMqKiqKi4srKipqampOOumk0tLSoUOH+lqhubl5woQJjY2N6XR67NixtbW1juMMHDiwqqrKNM1AIOBjsHHjxsbGxnnz5nU9ffv27aFQSAiRSqUymcxTTz11yy231NfXl5SU2Lbt2zNlZWXRaLS+vn7UqFHl5eXhcHjDhg22bU+ePFkI0dTUVFdXN3r06PLy8rVr186YMaOxsdHXW4FAIJ1Or1mzZuLEiUVFRWVlZZs2bRo9erRpml988UV+fn44HB4xYsT69euHDh3axRyHuCP2VUddXV1RUdEe/QytdSwWy8nJ2Zu1vg8Z3Rum/YH2A7r+02X8+QzYZVlrrbtM710+7e46CCF2sdN3Nzr36Ch0t9Z3N9i737nrHbpe2P9ojzD47+m/TPd39s/s/kX+T8yAfbPqQWfk//0A/G8d/x8RFQgJNv371wAAAABJRU5ErkJggg=='

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
      --ink:#e8eef8; --muted:#93a2bb; --vhd:#3557ab; --sky:#4fb8e7;
      --field:#0d1322; --card:#131a2a; --rule:#28324a; --bolt:#2b3550;
      --err-fg:#f4a9a2; --err-bg:#261414; --err-rule:#6d2620;
      /* #3557ab thay #4a72d0: chữ trắng trên nút đạt 6.77 thay vì 4.56 — 15px
         đậm vẫn tính là chữ thường nên phải hơn 4.5, sát ngưỡng thì không nên. */
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
    margin:14px 0 2px; padding:10px 12px; font-size:12.5px; border-radius:9px;
    color:var(--err-fg); background:var(--err-bg); border:1px solid var(--err-rule);
  }
  @media(prefers-reduced-motion:no-preference){
    .plate{animation:mount .26s cubic-bezier(.2,.7,.3,1) both}
    @keyframes mount{from{opacity:0;transform:translateY(8px)}}
  }
  @media(max-width:380px){
    .plate{padding:30px 22px 24px}
    .mark{width:84px;height:84px}
    .mark img{width:62px;height:62px}
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
  ${msg}
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <label for="e">Email</label>
  <input id="e" name="email" type="email" value="${escapeHtml(email)}"
         autocomplete="username" autocapitalize="none" spellcheck="false"
         inputmode="email" required autofocus>
  <label for="p">Mật khẩu</label>
  <input id="p" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Đăng nhập</button>
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
