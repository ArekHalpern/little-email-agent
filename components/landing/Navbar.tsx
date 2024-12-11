import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed w-full backdrop-blur-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl">
              LEA
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/features" className="hover:text-primary px-3 py-2">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-primary px-3 py-2">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-primary px-3 py-2">
                Blog
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
