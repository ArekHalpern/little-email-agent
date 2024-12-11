import { signup } from "../actions";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form className="w-full max-w-md space-y-4 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name:
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email:
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password:
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border p-2"
          />
        </div>

        <button
          type="submit"
          formAction={signup}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}
