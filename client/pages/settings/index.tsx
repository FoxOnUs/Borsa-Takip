import React, { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { button as buttonStyles } from "@heroui/theme";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

const SettingsPage = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [updateNicknameError, setUpdateNicknameError] = useState("");
    const [updatePasswordError, setUpdatePasswordError] = useState("");
    const [updateNicknameSuccess, setUpdateNicknameSuccess] = useState("");
    const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState("");

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId");

        setUserId(storedUserId);
        const storedNickname = localStorage.getItem("userNickname");

        if (storedNickname) {
            setNickname(storedNickname);
        }
    }, []);

    const handleNicknameUpdate = async (event: React.FormEvent) => {
        event.preventDefault();
        setUpdateNicknameError("");
        setUpdateNicknameSuccess("");

        if (!userId) {
            setUpdateNicknameError("User ID not found. Please log in again.");

            return;
        }

        if (!isValidNickname(nickname)) {
            setUpdateNicknameError(
                "Nickname must be at least 3 characters and can only contain letters and numbers.",
            );

            return;
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
            const updateNicknameEndpoint = `${apiBaseUrl}/users/${userId}/nickname`;

            const response = await fetch(updateNicknameEndpoint, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ nickname: nickname }),
            });

            if (response.ok) {
                const responseData = await response.json();

                setUpdateNicknameSuccess(responseData.message || "Nickname updated!");
                setUpdateNicknameError("");
                localStorage.setItem("userNickname", responseData.nickname);
            } else {
                const errorData = await response.json();

                setUpdateNicknameError(
                    errorData.message || "Failed to update nickname.",
                );
                setUpdateNicknameSuccess("");
            }
        } catch (error) {
            setUpdateNicknameError("Network error. Please try again later.");
            setUpdateNicknameSuccess("");
        }
    };

    const handlePasswordUpdate = async (event: React.FormEvent) => {
        event.preventDefault();
        setUpdatePasswordError("");
        setUpdatePasswordSuccess("");

        if (!userId) {
            setUpdatePasswordError("User ID not found. Please log in again.");

            return;
        }
        if (!isValidPassword(password)) {
            setUpdatePasswordError(
                "Password must be at least 6 characters and include a letter and a number.",
            );

            return;
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
            const updatePasswordEndpoint = `${apiBaseUrl}/users/${userId}/password`;

            const response = await fetch(updatePasswordEndpoint, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password: password }),
            });

            if (response.ok) {
                setUpdatePasswordSuccess("Password updated successfully!");
                setUpdatePasswordError("");
                setPassword("");
            } else {
                const errorData = await response.json();

                setUpdatePasswordError(
                    errorData.message || "Failed to update password.",
                );
                setUpdatePasswordSuccess("");
            }
        } catch (error) {
            setUpdatePasswordError("Network error. Please try again later.");
            setUpdatePasswordSuccess("");
        }
    };

    const isValidNickname = (nickname: string) => {
        if (nickname.length < 3) {
            return false;
        }
        const nicknameRegex = /^[a-zA-Z0-9]+$/;

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
                    <span className={title()}>Account Settings</span>
                </div>

                {userId ? (
                    <>
                        <form
                            className="flex flex-col w-full max-w-sm gap-4"
                            onSubmit={handleNicknameUpdate}
                        >
                            <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
                                <Input
                                    errorMessage={updateNicknameError}
                                    isInvalid={!!updateNicknameError}
                                    label="New Nickname"
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                            </div>
                            <button
                                className={buttonStyles({
                                    color: "primary",
                                    radius: "full",
                                    variant: "shadow",
                                    className: "w-full",
                                })}
                                type="submit"
                            >
                                Update Nickname
                            </button>
                            {updateNicknameSuccess && (
                                <p className="text-green-500 mt-2">{updateNicknameSuccess}</p>
                            )}
                            {updateNicknameError && (
                                <p className="text-red-500 mt-2">{updateNicknameError}</p>
                            )}
                        </form>

                        <form
                            className="flex flex-col w-full max-w-sm gap-4 mt-8"
                            onSubmit={handlePasswordUpdate}
                        >
                            <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
                                <Input
                                    errorMessage={updatePasswordError}
                                    isInvalid={!!updatePasswordError}
                                    label="New Password"
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
                                    className: "w-full",
                                })}
                                type="submit"
                            >
                                Update Password
                            </button>
                            {updatePasswordSuccess && (
                                <p className="text-green-500 mt-2">{updatePasswordSuccess}</p>
                            )}
                            {updatePasswordError && (
                                <p className="text-red-500 mt-2">{updatePasswordError}</p>
                            )}
                        </form>
                    </>
                ) : (
                    <p>User ID not found. Please log in to access settings.</p>
                )}
            </section>
        </DefaultLayout>
    );
};

export default SettingsPage;
