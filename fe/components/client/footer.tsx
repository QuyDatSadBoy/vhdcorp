export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MyApp. All rights reserved.
      </div>
    </footer>
  );
}
