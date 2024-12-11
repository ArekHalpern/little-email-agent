const testimonials = [
  {
    content:
      "LEA has completely transformed how I handle emails. It's like having a smart assistant that never sleeps.",
    author: "Sarah Chen",
    role: "Product Manager at TechCorp",
  },
  {
    content:
      "The AI responses are incredibly natural. My clients can't tell the difference.",
    author: "Michael Rodriguez",
    role: "Independent Consultant",
  },
  {
    content:
      "Finally, I can focus on important work instead of drowning in my inbox.",
    author: "Alex Kim",
    role: "Startup Founder",
  },
];

export default function Testimonials() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by professionals worldwide
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-3 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:grid-rows-1">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="flex flex-col justify-between backdrop-blur-sm rounded-2xl p-8 border"
            >
              <p className="text-lg leading-8">
                &ldquo;{testimonial.content}&rdquo;
              </p>
              <div className="mt-6">
                <div className="text-base font-semibold">
                  {testimonial.author}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {testimonial.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
