import Link from "next/link";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/products", label: "Sản phẩm" },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r bg-background h-full flex flex-col">
      <div className="p-6 border-b">
        <span className="text-lg font-bold">Admin Panel</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
