import React, { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { button as buttonStyles } from "@heroui/theme";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { useRouter } from 'next/router';
import { color } from "framer-motion";

interface FavoriteStock {
    name: string;
    double: number;
}

const ProfilePage = () => {
    const [userNickname, setUserNickname] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [favoriteStocks, setFavoriteStocks] = useState<FavoriteStock[]>([]);

    const router = useRouter();

    useEffect(() => {
        const nickname = localStorage.getItem('userNickname');
        const email = localStorage.getItem('userEmail');
        const storedUserId = localStorage.getItem('userId');

        setUserNickname(nickname);
        setUserEmail(email);
        setUserId(storedUserId);
    }, []);

    const navigateToSettings = () => {
        router.push('/settings');
    };

    const handleSignOut = () => {
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        router.push('/');
    };

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
                <div className="inline-block max-w-xl text-center justify-center">
                    <span className={title()}>Your Profile</span>
                </div>

                {userId ? (
                    <>
                        <div className="flex flex-col w-full max-w-sm gap-4">
                            <p><strong>Nickname:</strong> {userNickname || "N/A"}</p>
                            <p><strong>Email:</strong> {userEmail || "N/A"}</p>
                        </div>

                        <div className="mt-8 w-full max-w-md">
                            <h3>Favorite Stocks</h3>
                            {favoriteStocks && favoriteStocks.length > 0 ? (
                                <ul>
                                    {favoriteStocks.map((stock, index) => (
                                        <li key={index}>
                                            {stock.name} - Double Value: {stock.double}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No favorite stocks added yet.</p>
                            )}

                        </div>

                        <button
                            className={buttonStyles({
                                color: "secondary",
                                radius: "full",
                                variant: "bordered",
                                className: "w-full max-w-sm mt-8",
                            })}
                            onClick={navigateToSettings}
                        >
                            Go to Settings
                        </button>
                        <button
                            className={buttonStyles({
                                color: "danger",
                                radius: "full",
                                variant: "bordered",
                                className: "w-full max-w-sm mt-8",
                            })}
                            onClick={handleSignOut}
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <p>User information not found. Please log in.</p>
                )}
            </section>
        </DefaultLayout>
    );
};

export default ProfilePage;