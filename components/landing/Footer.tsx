export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-4 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-4 md:order-2">
          <a
            href="https://x.com/arek10000"
            className="inline-flex items-center justify-center text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-gray-800 hover:border-gray-700 shadow-sm hover:shadow active:translate-y-0.5"
          >
            X
          </a>
          <a
            href="https://github.com/ArekHalpern/little-email-agent"
            className="inline-flex items-center justify-center text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-gray-800 hover:border-gray-700 shadow-sm hover:shadow active:translate-y-0.5"
          >
            GitHub
          </a>
        </div>
        <div className="mt-2 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-gray-400">
            &copy; {new Date().getFullYear()} Little Email Agent. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
