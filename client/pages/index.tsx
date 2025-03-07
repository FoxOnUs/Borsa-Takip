import { useState } from "react";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { button as buttonStyles, input as inputStyles } from "@heroui/theme";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Sign In Logic
    console.log("Sign In Form Submitted", { email, password });
    // Backend Check
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
        <div className="inline-block max-w-xl text-center justify-center">
          <span className={title()}>Sign in to&nbsp;</span>
          <span className={title({ color: "violet" })}>Your Account</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full max-w-sm gap-4"
        >
          <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
            <Input label="Email" type="email" />
          </div>

          <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
            <Input label="Password" type="password" />
          </div>

          <button
            type="submit"
            className={buttonStyles({
              color: "primary",
              radius: "full",
              variant: "shadow",
              className: "w-full", // Make button full width
            })}
          >
            Sign in
          </button>
        </form>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?
          <Link href="/register" className="ml-1 text-primary-500">
            Sign up
          </Link>
        </p>
      </section>
    </DefaultLayout>
  );
}