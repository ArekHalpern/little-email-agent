import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleAuth from "../_components/GoogleAuth";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export default function SignupPage() {
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
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Create your account
          </h2>
          <p className="text-sm text-muted-foreground">
            Start managing your emails smarter, faster, and easier
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>

          <GoogleAuth mode="signup" />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form className="space-y-4">
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
                placeholder="Create a password"
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              formAction={signup}
              className="w-full"
              size="lg"
            >
              Get started
            </Button>
          </form>
        </div>

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
