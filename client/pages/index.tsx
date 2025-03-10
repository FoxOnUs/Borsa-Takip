import { useState } from "react";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { button as buttonStyles, input as inputStyles } from "@heroui/theme";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { useRouter } from 'next/router';

export default function SignInPage() {
  const [email, enterEmail] = useState("");
  const [password, enterPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoginError("");

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
      const loginEndpoint = `${apiBaseUrl}/login`;

      const response = await fetch(
        loginEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        console.log("Registration successful!");

        localStorage.setItem('userId', responseData.user_id.toString());
        localStorage.setItem("userNickname", responseData.nickname.toString());
        localStorage.setItem("userEmail", responseData.email.toString());
        router.push("/profile");
      }
      else if (response.status === 401) {
        setLoginError("Invalid email or password. Please try again.");
        console.error("Login failed: Invalid credentials");
      }
      else if (response.status === 400) {
        const errorData = await response.json();
        setLoginError(errorData.message || "Login failed. Please check your email/password.");
        console.error("Login failed: Bad Request", errorData);
      }
      else {
        const errorData = await response.json();
        console.error("Login failed:", response.status, errorData);
        setLoginError("Login failed. Please try again later.");
      }
    }
    catch (error) {
      console.error("Error during login:", error);
      setLoginError("Network error. Please try again later.");
    }
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
          {loginError && (
            <div className="text-red-500 mb-2">{loginError}</div>
          )}
          <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => enterEmail(e.target.value)}
            />
          </div>

          <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => enterPassword(e.target.value)}
            />
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
          Don&apos;t have an account?
          <Link href="/register" className="ml-1 text-primary-500">
            Sign up
          </Link>
        </p>
      </section>
    </DefaultLayout>
  );
}