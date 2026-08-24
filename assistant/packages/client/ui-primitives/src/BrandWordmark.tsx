// Wordmark VHD Corp — thay wordmark "deepseek-official" của bản gốc.
// Vẽ bằng chữ trong SVG thay vì đường path: tên công ty ngắn, dùng chữ thì nét
// luôn sắc ở mọi kích thước và sửa được trong một dòng.

import type { IconProps } from './icons/props.ts'

/** Tuỳ chọn hiển thị wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Có kèm logo dẫn đầu hay không; mặc định có. */
  includeMark?: boolean | undefined
}

/**
 * Render wordmark "VHD Corp".
 * @param props.size - chiều cao px (mặc định 24).
 * @param props.className - class thêm để đặt bố cục.
 * @returns svg wordmark (aria-hidden, là hình trang trí thương hiệu).
 */
export function BrandWordmark({ size = 24, className }: BrandWordmarkProps) {
  // Ink theo currentColor để chữ đọc được ở cả giao diện sáng và tối
  return (
    <svg
      width={(size * 96) / 24}
      height={size}
      className={className}
      viewBox="0 0 96 24"
      fill="none"
      aria-hidden="true"
    >
      <text
        x="0"
        y="17"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="-0.2"
      >
        VHD Corp
      </text>
    </svg>
  )
}
