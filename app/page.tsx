import Hero from "@/components/landing/Hero";
import Navbar from "@/components/landing/Navbar";

import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Footer />
    </main>
  );
}
