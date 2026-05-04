import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          MyApp
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-foreground/80 transition-colors">
            Trang chủ
          </Link>
          <Link href="/products" className="hover:text-foreground/80 transition-colors">
            Sản phẩm
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Đăng nhập
          </Link>
        </nav>
      </div>
    </header>
  );
}
