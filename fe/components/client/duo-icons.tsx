/**
 * Bộ icon DUOTONE vẽ tay cho VHD — thay icon outline mảnh (nhìn "AI/generic").
 * Phong cách: lớp nền fill mềm (opacity .22) + nét chính 1.8px bo tròn —
 * cảm giác "người design" như Phosphor/Solar duotone. Kế thừa currentColor,
 * dùng y hệt lucide: <ShieldDuo className="h-4 w-4" />. 0 dependency.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Khiên + tick — cam kết chất lượng */
export function ShieldDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 3l7 2.8v5.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.8L12 3z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M12 3l7 2.8v5.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.8L12 3z" />
      <path d="M9 11.8l2.1 2.1L15.4 9.5" />
    </svg>
  );
}

/** Xe tải giao hàng */
export function TruckDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M2.8 7.5h10.4v8H2.8z" fill="currentColor" opacity=".22" stroke="none" />
      <path d="M3 15.5V8.3c0-.4.3-.8.8-.8h9.4v8" />
      <path d="M13.2 10h3.6l3.4 3.2v2.3h-2" />
      <circle cx="7" cy="17.4" r="1.9" />
      <circle cx="16.6" cy="17.4" r="1.9" />
      <path d="M8.9 17.4h5.8M3 15.5h2.1" />
    </svg>
  );
}

/** Tai nghe tư vấn */
export function HeadsetDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M4.4 13.2h2.2c.6 0 1 .4 1 1v3.6c0 .6-.4 1-1 1H5.4a1 1 0 0 1-1-1v-4.6zM17.4 13.2h2.2v4.6a1 1 0 0 1-1 1h-1.2c-.6 0-1-.4-1-1v-3.6c0-.6.4-1 1-1z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M4.4 14.5v-2A7.6 7.6 0 0 1 12 4.9a7.6 7.6 0 0 1 7.6 7.6v2" />
      <rect x="4.4" y="13.2" width="3.2" height="5.6" rx="1" />
      <rect x="16.4" y="13.2" width="3.2" height="5.6" rx="1" />
      <path d="M19.6 17.6c0 2-1.9 2.9-4.4 3" />
    </svg>
  );
}

/** Huy chương — uy tín */
export function MedalDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="9.2" r="4.6" fill="currentColor" opacity=".22" stroke="none" />
      <circle cx="12" cy="9.2" r="4.6" />
      <path
        d="M12 7.2l.9 1.6 1.8.3-1.3 1.3.3 1.8-1.7-.9-1.7.9.3-1.8-1.3-1.3 1.8-.3L12 7.2z"
        fill="currentColor"
        opacity=".5"
        stroke="none"
      />
      <path d="M9.2 13l-1.7 7 4.5-2.4L16.5 20l-1.7-7" />
    </svg>
  );
}

/** Ngôi sao đánh giá */
export function StarDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6z" />
    </svg>
  );
}

/** Đồng hồ — nhanh chóng */
export function ClockDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity=".22" stroke="none" />
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3.1 1.9" />
    </svg>
  );
}

/** Lá — bền vững */
export function LeafDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5.2 18.8C5.2 9.6 12.8 5.2 19.6 5.2c0 7.8-3.8 13.6-12.6 13.6H5.2z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M5.2 18.8C5.2 9.6 12.8 5.2 19.6 5.2c0 7.8-3.8 13.6-12.6 13.6H5.2z" />
      <path d="M5.2 18.8c2.8-4.8 6.6-7.8 10.6-9.6" />
    </svg>
  );
}

/** Like — hài lòng */
export function ThumbsUpDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M7.2 11.4h10.4a1.9 1.9 0 0 1 1.9 2.3l-1.2 5.2a1.9 1.9 0 0 1-1.9 1.5H7.2v-9z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M7.2 20.4h9.2c.9 0 1.7-.6 1.9-1.5l1.2-5.2a1.9 1.9 0 0 0-1.9-2.3h-3.9l.7-3.3a1.9 1.9 0 0 0-3.5-1.4L7.2 11.4" />
      <rect x="3.2" y="11.4" width="4" height="9" rx="1" fill="currentColor" opacity=".22" stroke="none" />
      <rect x="3.2" y="11.4" width="4" height="9" rx="1" />
    </svg>
  );
}

/** Tia sáng 4 cánh — giá trị nổi bật */
export function SparkDuo(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 3.4l1.9 4.9 4.9 1.9-4.9 1.9L12 17l-1.9-4.9L5.2 10.2l4.9-1.9L12 3.4z"
        fill="currentColor"
        opacity=".22"
        stroke="none"
      />
      <path d="M12 3.4l1.9 4.9 4.9 1.9-4.9 1.9L12 17l-1.9-4.9L5.2 10.2l4.9-1.9L12 3.4z" />
      <path
        d="M18.6 16.4l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7.7-1.7z"
        fill="currentColor"
        opacity=".5"
        stroke="none"
      />
    </svg>
  );
}
