import GoogleAuth from "@/app/(auth)/_components/GoogleAuth";

export default function Hero() {
  return (
    <div className="relative isolate pt-14">
      <div className="py-24 sm:py-32 lg:pb-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Your Personal Email Assistant
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Let AI handle your inbox. Little Email Agent reads, categorizes,
              and responds to emails intelligently, saving you hours every week.
            </p>
            <div className="mt-10">
              <GoogleAuth mode="signup" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
