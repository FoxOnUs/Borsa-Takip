import { useState } from "react";
import { Input } from "@heroui/input";
import { button as buttonStyles } from "@heroui/theme";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { useRouter } from "next/router";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [registrationError, setRegistrationError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [nicknameError, setNicknameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setRegistrationError("");
        setEmailError("");
        setNicknameError("");
        setPasswordError("");

        let isValid = true;

        if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address.");
            isValid = false;
        }

        if (!isValidNickname(nickname)) {
            setNicknameError(
                "Nickname must be at least 3 characters and can only contain letters and numbers.",
            );
            isValid = false;
        }

        if (!isValidPassword(password)) {
            setPasswordError(
                "Password must be at least 6 characters and include a letter and a number.",
            );
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
            const registerEndpoint = `${apiBaseUrl}/register`;

            const response = await fetch(registerEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ nickname, email, password }),
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log("Registration successful!");

                localStorage.setItem('userId', responseData.user_id.toString());
                localStorage.setItem("userNickname", nickname);
                localStorage.setItem("userEmail", email);
                router.push("/profile");
            } else {
                const errorData = await response.json();

                console.error("Registration failed:", errorData);
                setRegistrationError(
                    errorData.message || "Registration failed. Please try again.",
                );
            }
        } catch (error) {
            console.error("Error during registration:", error);
            setRegistrationError("Network error. Please try again later.");
        }
    };

    const isValidEmail = (email: string) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        return emailRegex.test(email);
    };

    const isValidNickname = (nickname: string) => {
        if (nickname.length < 3) {
            return false;
        }
        const nicknameRegex = /^[a-zA-Z0-9]+$/; // Only letters and numbers

        return nicknameRegex.test(nickname);
    };

    const isValidPassword = (password: string) => {
        if (password.length < 6) {
            return false;
        }
        const letterRegex = /[a-zA-Z]/;
        const numberRegex = /[0-9]/;

        return letterRegex.test(password) && numberRegex.test(password);
    };

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
                <div className="inline-block max-w-xl text-center justify-center">
                    <span className={title()}>Sign up to&nbsp;</span>
                    <span className={title({ color: "blue" })}>a new Account</span>
                </div>

                <form
                    className="flex flex-col w-full max-w-sm gap-4"
                    onSubmit={handleSubmit}
                >
                    <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
                        <Input
                            errorMessage={emailError}
                            isInvalid={!!emailError}
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
                        <Input
                            errorMessage={nicknameError}
                            isInvalid={!!nicknameError}
                            label="Nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                    </div>
                    <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
                        <Input
                            errorMessage={passwordError}
                            isInvalid={!!passwordError}
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        className={buttonStyles({
                            color: "primary",
                            radius: "full",
                            variant: "shadow",
                            className: "w-full", // Make button full width
                        })}
                        type="submit"
                    >
                        Sign Up
                    </button>
                    {registrationError && (
                        <p className="text-red-500 mt-2">{registrationError}</p>
                    )}
                </form>
            </section>
        </DefaultLayout>
    );
}
