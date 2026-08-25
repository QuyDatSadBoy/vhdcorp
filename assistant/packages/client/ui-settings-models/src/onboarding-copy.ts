/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = '2026-08-13.1'

/** Lời chào khi vào lần đầu — đã thay nội dung của bản gốc bằng nội dung VHD. */
export const WELCOME_NOTICE_COPY = {
  zh: {
    title: 'Trợ lý nội bộ VHD Corp',
    body: 'Đây là trợ lý dùng chung của anh em VHD Corp. Bạn làm việc trong thư mục riêng của mình; trợ lý đọc ghi tệp và chạy lệnh được trong đó.\n\nVài điều nên biết: máy chủ chỉ phục vụ một số người cùng lúc, nên khi bạn không dùng khoảng 20 phút thì trợ lý tự tắt để nhường máy — lần vào sau chờ vài giây là chạy lại. Đừng để dữ liệu riêng tư của khách hàng vào đây.',
    continueLabel: 'Bắt đầu',
  },
  en: {
    title: 'Trợ lý nội bộ VHD Corp',
    body: 'Đây là trợ lý dùng chung của anh em VHD Corp. Bạn làm việc trong thư mục riêng của mình; trợ lý đọc ghi tệp và chạy lệnh được trong đó.\n\nVài điều nên biết: máy chủ chỉ phục vụ một số người cùng lúc, nên khi bạn không dùng khoảng 20 phút thì trợ lý tự tắt để nhường máy — lần vào sau chờ vài giây là chạy lại. Đừng để dữ liệu riêng tư của khách hàng vào đây.',
    continueLabel: 'Bắt đầu',
  },
} as const
