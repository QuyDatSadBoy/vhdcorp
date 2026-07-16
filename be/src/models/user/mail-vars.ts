/** Thay biến {{name}}/{{email}} cho email hàng loạt, rồi gỡ mọi {{...}} còn sót
 *  (vd admin lỡ sửa chữ bên trong ngoặc → tránh gửi đi "{{Trần Quý Đạt}}"). Hàm thuần để test. */
export function personalizeEmail(
  template: string,
  name: string,
  email: string,
): string {
  const replaced = template
    .replaceAll('{{name}}', name)
    .replaceAll('{{email}}', email);
  return replaced.replace(/\{\{\s*([^}]*?)\s*\}\}/g, '$1');
}
