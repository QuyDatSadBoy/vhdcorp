/**
 * Prisma seed — admin + categories + sample products + posts + default SiteConfig.
 * Chạy: `yarn prisma:seed` (xem package.json `prisma.seed`).
 */
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import {
  PostStatus,
  PrismaClient,
  ProductStatus,
  Role,
  ConfigStatus,
} from '@vhd/prisma-client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ['error'] });

async function seedAdmin() {
  const email = 'admin@vhdcorp.com';
  const password = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: 'VHD Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin: ${admin.email} (id=${admin.id})`);
  return admin;
}

async function seedCategories() {
  const roots = [
    { slug: 'nhua-cao-su', name: 'Nhựa & Cao su', order: 1 },
    { slug: 'thuc-pham-lang-nghe', name: 'Thực phẩm làng nghề', order: 2 },
    { slug: 'do-thu-cong', name: 'Đồ thủ công', order: 3 },
    { slug: 'san-pham-khac', name: 'Sản phẩm khác', order: 4 },
  ];
  const created = [] as { id: number; slug: string }[];
  for (const c of roots) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: c,
    });
    created.push({ id: cat.id, slug: cat.slug });
  }
  console.log(`✓ Categories: ${created.length}`);
  return created;
}

async function seedProducts(categories: { id: number; slug: string }[]) {
  const samples = [
    {
      slug: 'ong-nhua-pvc-d21',
      name: 'Ống nhựa PVC D21',
      price: 25000,
      stock: 500,
      categorySlug: 'nhua-cao-su',
    },
    {
      slug: 'tam-cao-su-non',
      name: 'Tấm cao su non chống rung',
      price: 180000,
      stock: 120,
      categorySlug: 'nhua-cao-su',
    },
    {
      slug: 'nuoc-mam-truyen-thong-1l',
      name: 'Nước mắm truyền thống 1L',
      price: 95000,
      stock: 300,
      categorySlug: 'thuc-pham-lang-nghe',
    },
    {
      slug: 'che-thai-nguyen-tan-cuong',
      name: 'Chè Tân Cương Thái Nguyên',
      price: 220000,
      stock: 80,
      categorySlug: 'thuc-pham-lang-nghe',
    },
    {
      slug: 'non-la-lang-chuong',
      name: 'Nón lá làng Chuông',
      price: 75000,
      stock: 60,
      categorySlug: 'do-thu-cong',
    },
    {
      slug: 'tranh-dong-ho',
      name: 'Tranh dân gian Đông Hồ',
      price: 150000,
      stock: 40,
      categorySlug: 'do-thu-cong',
    },
    {
      slug: 'qua-tang-doanh-nghiep',
      name: 'Set quà tặng doanh nghiệp',
      price: 850000,
      stock: 20,
      categorySlug: 'san-pham-khac',
    },
    {
      slug: 'tui-vai-canvas-vhd',
      name: 'Túi vải canvas VHD Corp',
      price: 65000,
      stock: 200,
      categorySlug: 'san-pham-khac',
    },
  ];
  let count = 0;
  for (const p of samples) {
    const cat = categories.find((c) => c.slug === p.categorySlug);
    if (!cat) continue;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: `Sản phẩm mẫu: ${p.name}. VHD Corp cam kết chất lượng và uy tín.`,
        price: p.price,
        stock: p.stock,
        images: [],
        categoryId: cat.id,
        status: ProductStatus.PUBLISHED,
      },
    });
    count++;
  }
  console.log(`✓ Products: ${count}`);
}

async function seedPosts(authorId: number) {
  const samples = [
    {
      slug: 'vhd-corp-ket-noi-gia-tri',
      title: 'VHD Corp — Kết nối giá trị, hợp tác vững bền',
      excerpt: 'Hành trình của VHD Corp trong việc đưa sản phẩm Việt vươn xa.',
    },
    {
      slug: 'lang-nghe-truyen-thong-vn',
      title: 'Làng nghề truyền thống Việt Nam — Di sản sống',
      excerpt: 'Khám phá những làng nghề trăm tuổi trên dải đất hình chữ S.',
    },
    {
      slug: 'xu-huong-nhua-cao-su-2026',
      title: 'Xu hướng ngành nhựa & cao su 2026',
      excerpt: 'Phân tích thị trường, công nghệ và cơ hội xuất khẩu.',
    },
  ];
  for (const p of samples) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: `<p>${p.excerpt}</p><p>Nội dung chi tiết sẽ được cập nhật...</p>`,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        tags: ['vhd', 'tin-tuc'],
        authorId,
      },
    });
  }
  console.log(`✓ Posts: ${samples.length}`);
}

async function seedSiteConfig(adminId: number) {
  const value = {
    brand: {
      siteName: 'VHD Corp',
      tagline: 'KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN',
      logo: { url: '/images/vhdcorplogo.jpeg', publicId: '' },
      favicon: { url: '/icons/favicon-32.png' },
      ogDefaultImage: {
        url: '/images/og-default.jpg',
        width: 1200,
        height: 630,
      },
    },
    theme: {
      colors: {
        primary: '#1B3A8C',
        accent: '#4FB8E7',
        highlight: '#F5A623',
        danger: '#C8102E',
        background: '#FFFFFF',
        surface: '#F7F8FA',
        text: '#1A1A2E',
      },
      fonts: {
        heading: 'Be Vietnam Pro',
        body: 'Inter',
        baseFontSize: 16,
      },
      spacing: 'normal',
      borderRadius: 8,
    },
    seo: {
      titleTemplate: '%s | VHD Corp',
      defaultDescription:
        'VHD Corp — kết nối sản phẩm Việt với thị trường toàn cầu.',
      ogImage: '',
      googleAnalyticsId: '',
      googleTagManagerId: '',
      facebookPixelId: '',
    },
    pages: {
      home: { sections: [] },
      about: { sections: [] },
      contact: { sections: [] },
    },
    header: {
      promoText: 'Miễn phí giao hàng cho đơn B2B trên 5 triệu',
      showPromo: true,
    },
    navigation: [
      { id: 'nav-home', label: 'Trang chủ', href: '/', order: 1, children: [] },
      {
        id: 'nav-products',
        label: 'Sản phẩm',
        href: '/products',
        order: 2,
        children: [],
      },
      {
        id: 'nav-posts',
        label: 'Tin tức',
        href: '/posts',
        order: 3,
        children: [],
      },
      {
        id: 'nav-about',
        label: 'Giới thiệu',
        href: '/about',
        order: 4,
        children: [],
      },
      {
        id: 'nav-contact',
        label: 'Liên hệ',
        href: '/contact',
        order: 5,
        children: [],
      },
    ],
    footer: {
      description:
        'VHD Corp — tổng kho nhựa, cao su và sản phẩm làng nghề Việt. Kết nối giá trị, hợp tác vững bền.',
      contact: {
        email: 'contact@vhdcorp.vn',
        phone: '',
        hotline: '',
        address: 'TP. Hồ Chí Minh, Việt Nam',
        floatingWidget: true,
        messengerUrl: '',
        zaloUrl: '',
      },
      columns: [
        {
          heading: 'Về chúng tôi',
          links: [{ label: 'Giới thiệu', href: '/about' }],
        },
        {
          heading: 'Sản phẩm',
          links: [{ label: 'Tất cả sản phẩm', href: '/products' }],
        },
        { heading: 'Hỗ trợ', links: [{ label: 'Liên hệ', href: '/contact' }] },
      ],
      social: [
        { platform: 'facebook', url: '' },
        { platform: 'zalo', url: '' },
        { platform: 'youtube', url: '' },
      ],
      copyright: '© 2026 VHD Corp. All rights reserved.',
      showMap: true,
    },
    customCss: '',
  };

  await prisma.siteConfig.upsert({
    where: { key_status: { key: 'main', status: ConfigStatus.PUBLISHED } },
    update: {},
    create: {
      key: 'main',
      value,
      version: 1,
      status: ConfigStatus.PUBLISHED,
      updatedBy: adminId,
    },
  });
  console.log('✓ SiteConfig main (PUBLISHED)');
}

async function main() {
  console.log('→ Seeding VHD Corp database...');
  const admin = await seedAdmin();
  const categories = await seedCategories();
  await seedProducts(categories);
  await seedPosts(admin.id);
  await seedSiteConfig(admin.id);
  console.log('✔ Seed hoàn tất');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
