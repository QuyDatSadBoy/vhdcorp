/**
 * The /api URL prefix — single source for both halves of the web transport.
 * The node half registers this prefix on the web server; both halves share the
 * event paths below for the browser WebSocket downlinks.
 */

/**
 * Route prefix owning every api request.
 *
 * KHÔNG dùng `/api` như bản gốc: trợ lý này đứng sau Cloudflare của vhdcorp.com,
 * nơi đã có luật chặn `/api*` để bảo vệ API của web bán hàng — mọi request của
 * trợ lý sẽ bị trả 403 trước khi tới máy chủ. Đổi tiền tố là cách sửa gọn nhất,
 * vì đây là nguồn duy nhất cho cả hai phía (trình duyệt và máy chủ).
 */
export const API_PATH = '/dsh-rpc'

/** Browser mux-frame WebSocket pathname. */
export const MUX_EVENTS_PATH = `${API_PATH}/events.mux`

/** Browser host-frame WebSocket pathname. */
export const HOST_EVENTS_PATH = `${API_PATH}/events.host`
