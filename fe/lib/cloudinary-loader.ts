// Custom loader cho next/image: ảnh Cloudinary được tối ưu ngay trên CDN Cloudinary
// (f_auto = webp/avif, q_auto = nén thông minh, c_limit + w = resize theo khung hiển thị)
// → ảnh nhẹ hơn nhiều, phục vụ từ CDN, KHÔNG chiếm tài nguyên optimizer của Next server.
type LoaderProps = { src: string; width: number; quality?: number };

export default function cloudinaryLoader({ src, width, quality }: LoaderProps): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    const t = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
    return src.replace("/upload/", `/upload/${t}/`);
  }
  // Ảnh local (/images/...) hoặc nguồn khác: giữ nguyên.
  return src;
}
