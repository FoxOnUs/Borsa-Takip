import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import DefaultLayout from "@/layouts/default";
import { title } from "@/components/primitives";

interface StockData {
    symbol: string;
    interval: string;
    intraday_prices?: { datetime: string, open: number, high: number, low: number, close: number, volume: number }[];
    daily_prices?: { datetime: string, open: number, high: number, low: number, close: number, volume: number }[];
    error?: string;
}

interface StockListItem {
    symbol: string;
    intradayPrice?: number;
    percentageChange?: number;
    lastDayClose?: number;
    error?: string;
}


const StockListPage: React.FC = () => {
    const [stockSymbols, setStockSymbols] = useState<string[]>([]);
    const [stockListItems, setStockListItems] = useState<StockListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSymbolsAndData = async () => {
            setLoading(true);
            setError(null);
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
                const symbolsEndpoint = `${apiBaseUrl}/api/stock_symbols`;
                const symbolsResponse = await fetch(symbolsEndpoint);

                if (!symbolsResponse.ok) {
                    throw new Error(`Failed to fetch stock symbols: ${symbolsResponse.status} ${symbolsResponse.statusText}`);
                }
                const symbolsData: string[] = await symbolsResponse.json();

                setStockSymbols(symbolsData);

                const stockDataItems: StockListItem[] = [];

                for (const symbol of symbolsData) {
                    const intradayData = await fetchStockData(symbol, 'intraday');
                    const dailyData = await fetchStockData(symbol, 'daily');

                    stockDataItems.push(processStockData(symbol, intradayData, dailyData));
                }
                setStockListItems(stockDataItems);


            } catch (err: any) {
                console.error("Error fetching data:", err);
                setError(err.message || 'Failed to fetch stock data.');
            } finally {
                setLoading(false);
            }
        };

        fetchSymbolsAndData();
    }, []);

    const fetchStockData = async (symbol: string, dataType: 'intraday' | 'daily'): Promise<StockData> => {
        const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
        const response = await fetch(`${apiBaseUrl}/stock/${symbol}?data_type=${dataType}`);

        if (!response.ok) {
            const errorData = await response.json();

            throw new Error(errorData?.message || `Failed to fetch ${dataType} data for ${symbol}: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    };


    const processStockData = (symbol: string, intradayData: StockData, dailyData: StockData): StockListItem => {
        let intradayPrice: number | undefined;
        let percentageChange: number | undefined;
        let lastDayClose: number | undefined;
        let error: string | undefined;

        if (intradayData.error) {
            error = intradayData.error;
        } else if (intradayData.intraday_prices && intradayData.intraday_prices.length > 0) {
            intradayPrice = intradayData.intraday_prices[0].close;
        }

        if (dailyData.error) {
            error = error || dailyData.error;
        } else if (dailyData.daily_prices && dailyData.daily_prices.length > 0) {
            lastDayClose = dailyData.daily_prices[0].close; // Last days close
        }


        if (intradayPrice !== undefined && lastDayClose !== undefined) {
            percentageChange = ((intradayPrice - lastDayClose) / lastDayClose) * 100;
        }


        return {
            symbol,
            intradayPrice,
            percentageChange,
            lastDayClose,
            error: error
        };
    };


    if (loading) {
        return <DefaultLayout><p>Loading stock data...</p></DefaultLayout>;
    }

    if (error) {
        return <DefaultLayout><p className="text-red-500">Error: {error}</p></DefaultLayout>;
    }

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
                <div className="inline-block max-w-xl text-center justify-center">
                    <span className={title()}>Stock Prices</span>
                </div>

                <ul className="w-full max-w-md divide-y divide-gray-200">
                    {stockListItems.map((item) => (
                        <li key={item.symbol} className="py-4">
                            <NextLink href={`/stockdetails/${item.symbol}`} passHref legacyBehavior>
                                <div className="flex items-center justify-between">
                                    <p className="text-lg font-semibold text-gray-800">{item.symbol}</p>
                                    {item.error ? (
                                        <p className="text-red-500 text-sm">{item.error}</p>
                                    ) : (
                                        <div>
                                            {item.intradayPrice !== undefined && (
                                                <p className="text-gray-600">${item.intradayPrice.toFixed(2)}</p>
                                            )}
                                            {item.percentageChange !== undefined && (
                                                <p className={`text-sm font-medium ${item.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {item.percentageChange.toFixed(2)}%
                                                    {item.percentageChange >= 0 ? ' ↗' : ' ↘'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {item.lastDayClose !== undefined && item.intradayPrice !== undefined && !item.error && (
                                    <p className="text-gray-500 text-sm">
                                        vs last close: ${item.lastDayClose.toFixed(2)}
                                    </p>
                                )}

                            </NextLink>
                        </li>
                    ))}
                </ul>
            </section>
        </DefaultLayout>
    );
};

export default StockListPage;