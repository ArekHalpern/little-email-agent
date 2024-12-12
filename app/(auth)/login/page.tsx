import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleAuth from "../_components/GoogleAuth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email to sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-4">
          <div className="space-y-4">
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
              formAction={login}
              className="w-full"
              size="lg"
            >
              Sign in
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
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
