import { personalizeEmail } from './mail-vars';

describe('personalizeEmail (email hàng loạt)', () => {
  it('thay {{name}} và {{email}}', () => {
    expect(personalizeEmail('Chào {{name}} ({{email}})', 'An', 'a@x.com')).toBe(
      'Chào An (a@x.com)',
    );
  });
  it('gỡ ngoặc {{...}} còn sót, giữ chữ bên trong (bug {{Trần Quý Đạt}})', () => {
    expect(personalizeEmail('Xin chào {{Trần Quý Đạt}}', 'An', 'a@x.com')).toBe(
      'Xin chào Trần Quý Đạt',
    );
  });
  it('nhiều biến + sót lẫn lộn', () => {
    expect(
      personalizeEmail(
        '{{name}} - {{Khuyến Mãi}} - {{email}}',
        'An',
        'a@x.com',
      ),
    ).toBe('An - Khuyến Mãi - a@x.com');
  });
  it('không có biến → giữ nguyên', () => {
    expect(personalizeEmail('Nội dung thường', 'An', 'a@x.com')).toBe(
      'Nội dung thường',
    );
  });
});
