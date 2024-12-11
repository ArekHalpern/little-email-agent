import Hero from "@/components/landing/Hero";
import Navbar from "@/components/landing/Navbar";
import Testimonials from "@/components/landing/Testimonials";
import CallToAction from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Testimonials />
      <CallToAction />
      <Footer />
    </main>
  );
}
