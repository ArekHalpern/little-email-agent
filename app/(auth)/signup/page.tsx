import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleAuth from "../_components/GoogleAuth";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Create an account
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your details below to create your account
          </p>
        </div>

        <form className="mt-8 space-y-4">
          <div className="space-y-4">
            <div>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Full name"
                required
                className="w-full"
              />
            </div>

            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              formAction={signup}
              className="w-full"
              size="lg"
            >
              Create account
            </Button>
          </div>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleAuth />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
