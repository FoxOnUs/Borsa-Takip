/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable no-console */

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';

import DefaultLayout from "@/layouts/default";
import { title } from "@/components/primitives";

interface StockData {
    symbol: string;
    interval: string;
    period: string;
    [key: string]: any;
    error?: string;
}

interface StockListItem {
    symbol: string;
    intradayPrice?: number;
    percentageChange?: number;
    lastDayClose?: number;
    error?: string;
}

const STOCK_DATA_CACHE_KEY = 'stockDataCache';
const CACHE_EXPIRY_TIME_MS = 1 * 30 * 1000; // 30 seconds

const StockListPage: React.FC = () => {
    const [stockSymbols, setStockSymbols] = useState<string[]>([]);
    const [stockListItems, setStockListItems] = useState<StockListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

    useEffect(() => {
        fetchSymbolsAndData();
    }, []);

    const fetchStockData = async (symbol: string, interval: string, period: string): Promise<StockData> => {
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
            const queryString = new URLSearchParams({ interval, period }).toString();

            console.log(`Fetching ${symbol} data with interval=${interval}, period=${period}`);
            const response = await fetch(`${apiBaseUrl}/stock/${symbol}?${queryString}`);

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;

                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }

                console.error(`Error fetching ${symbol}: Status ${response.status}`, errorData);

                return {
                    symbol,
                    interval,
                    period,
                    error: errorData.error || `Failed to fetch data: ${response.status} ${response.statusText}`
                };
            }

            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
            } catch (e: any) {
                console.error(`JSON parse error for ${symbol}:`, responseText);

                return {
                    symbol,
                    interval,
                    period,
                    error: `Invalid JSON response: ${e.message}`
                };
            }

            return {
                symbol,
                interval,
                period,
                ...data
            };
        } catch (err: any) {
            console.error(`Network error fetching ${symbol}:`, err);

            return {
                symbol,
                interval,
                period,
                error: `Network error: ${err.message}`
            };
        }
    };

    const fetchSymbolsAndData = async () => {
        setLoading(true);
        setError(null);

        const cachedData = localStorage.getItem(STOCK_DATA_CACHE_KEY);
        const lastCacheTime = localStorage.getItem(`${STOCK_DATA_CACHE_KEY}_timestamp`);

        if (cachedData && lastCacheTime && (Date.now() - Number(lastCacheTime)) < CACHE_EXPIRY_TIME_MS) {
            try {
                const parsedCachedData = JSON.parse(cachedData);

                setStockListItems(parsedCachedData);
                setLoading(false);

                return;
            } catch (e) {
                console.error("Error parsing cached data:", e);
            }
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
            const symbolsResponse = await fetch(`${apiBaseUrl}/api/stock_symbols`);

            if (!symbolsResponse.ok) {
                throw new Error(`Failed to fetch stock symbols: ${symbolsResponse.status} ${symbolsResponse.statusText}`);
            }

            const symbolsData: string[] = await symbolsResponse.json();

            setStockSymbols(symbolsData);

            const stockListItemsUpdated: StockListItem[] = [];

            for (const symbol of symbolsData) {
                try {
                    let intradayData: StockData;

                    try {
                        intradayData = await fetchStockData(symbol, '5m', '1d');
                    } catch (e) {
                        intradayData = await fetchStockData(symbol, '1d', '1d');
                    }

                    let historyData: StockData;

                    try {
                        historyData = await fetchStockData(symbol, '1d', '5d');
                    } catch (e) {
                        historyData = await fetchStockData(symbol, '1d', '1wk');
                    }

                    if (intradayData.symbol !== symbol) {
                        console.error(`Symbol mismatch: expected ${symbol}, got ${intradayData.symbol}`);
                        intradayData.symbol = symbol;
                    }

                    if (historyData.symbol !== symbol) {
                        console.error(`Symbol mismatch: expected ${symbol}, got ${historyData.symbol}`);
                        historyData.symbol = symbol;
                    }

                    const processedItem = processStockData(symbol, intradayData, historyData);

                    stockListItemsUpdated.push(processedItem);
                } catch (err: any) {
                    console.error(`Error processing ${symbol}:`, err);
                    stockListItemsUpdated.push({
                        symbol,
                        error: `Failed to process data: ${err.message}`
                    });
                }
            }

            setStockListItems(stockListItemsUpdated);

            localStorage.setItem(STOCK_DATA_CACHE_KEY, JSON.stringify(stockListItemsUpdated));
            localStorage.setItem(`${STOCK_DATA_CACHE_KEY}_timestamp`, Date.now().toString());

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(err.message || 'Failed to fetch stock data.');
        } finally {
            setLoading(false);
        }
    };

    const sortStockItems = (items: StockListItem[], order: 'asc' | 'desc'): StockListItem[] => {
        return [...items].sort((a, b) => {
            if (a.error && !b.error) return 1;
            if (!a.error && b.error) return -1;
            if (a.error && b.error) return a.symbol.localeCompare(b.symbol);

            if (a.percentageChange === undefined && b.percentageChange !== undefined) return 1;
            if (a.percentageChange !== undefined && b.percentageChange === undefined) return -1;
            if (a.percentageChange === undefined && b.percentageChange === undefined) {
                return a.symbol.localeCompare(b.symbol);
            }

            if (order === 'desc') {
                return (b.percentageChange as number) - (a.percentageChange as number);
            } else {
                return (a.percentageChange as number) - (b.percentageChange as number);
            }
        });
    };

    const toggleSortOrder = () => {
        const newOrder = sortOrder === null ? 'desc' : sortOrder === 'desc' ? 'asc' : 'desc';

        setSortOrder(newOrder);
        setStockListItems(sortStockItems(stockListItems, newOrder));
    };

    const processStockData = (symbol: string, intradayData: StockData, historyData: StockData): StockListItem => {
        console.log(`\n--- processStockData for symbol: ${symbol} ---`);

        let intradayPrice: number | undefined = undefined;
        let percentageChange: number | undefined = undefined;
        let lastDayClose: number | undefined = undefined;
        let error: string | undefined = undefined;
        const errorDetails: string[] = [];

        if (intradayData.error) {
            errorDetails.push(`Intraday data: ${intradayData.error}`);
        } else {
            try {
                const timeSeriesKey = Object.keys(intradayData).find(key =>
                    key.startsWith("Time Series") || key.includes("Series"));

                if (timeSeriesKey && intradayData[timeSeriesKey]) {
                    const timeSeries = intradayData[timeSeriesKey];
                    const timePoints = Object.keys(timeSeries);

                    if (timePoints.length > 0) {
                        const latestDataKey = timePoints[0];
                        const latestData = timeSeries[latestDataKey];

                        const closePrice =
                            latestData["4. close"] ||
                            latestData["close"] ||
                            latestData["Close"];

                        if (closePrice !== undefined && closePrice !== null) {
                            console.log(`${symbol} closePrice intraday:`, closePrice);
                            intradayPrice = closePrice;
                        } else {
                            errorDetails.push("Close price not found in intraday data");
                        }
                    } else {
                        errorDetails.push("No data points in intraday series");
                    }
                } else {
                    errorDetails.push("Invalid intraday data format");
                }
            } catch (err: any) {
                errorDetails.push(`Error processing intraday data: ${err.message}`);
            }
        }

        if (historyData.error) {
            errorDetails.push(`Historical data: ${historyData.error}`);
        } else {
            try {
                const timeSeriesKey = Object.keys(historyData).find(key =>
                    key.startsWith("Time Series") || key.includes("Series"));

                if (timeSeriesKey && historyData[timeSeriesKey]) {
                    const timeSeries = historyData[timeSeriesKey];
                    const timePoints = Object.keys(timeSeries);

                    if (timePoints.length > 0) {
                        const previousDataKey = timePoints.length > 1 ? timePoints[1] : timePoints[0];
                        const previousData = timeSeries[previousDataKey];

                        const closePrice =
                            previousData["4. close"] ||
                            previousData["close"] ||
                            previousData["Close"];

                        if (closePrice !== undefined && closePrice !== null) {
                            console.log(`${symbol} closePrice history:`, closePrice);
                            lastDayClose = closePrice;
                        } else {
                            errorDetails.push("Close price not found in historical data");
                        }
                    } else {
                        errorDetails.push("No data points in historical series");
                    }
                } else {
                    errorDetails.push("Invalid historical data format");
                }
            } catch (err: any) {
                errorDetails.push(`Error processing historical data: ${err.message}`);
            }
        }

        if (errorDetails.length > 0) {
            error = errorDetails.join('; ');
        }

        if (intradayPrice !== undefined && lastDayClose !== undefined &&
            intradayPrice !== null && lastDayClose !== null) {
            percentageChange = ((intradayPrice - lastDayClose) / lastDayClose) * 100;
        }

        return {
            symbol,
            intradayPrice,
            percentageChange,
            lastDayClose,
            error
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

                <div className="w-full max-w-md flex justify-between items-center mb-2">
                    <span className="text-sm font-tiny">Sort:</span>
                    <button
                        className="px-2 py-1 bg-gray-600 rounded-md hover:bg-gray-500 flex items-center gap-1 transition-colors text-sm"
                        onClick={toggleSortOrder}
                    >
                        {sortOrder === null ? 'By % Change' :
                            sortOrder === 'desc' ? 'Highest % first' : 'Lowest % first'}
                        {sortOrder === null ? '' : (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                    </button>
                </div>

                <ul className="w-full max-w-md divide-y divide-gray-200">
                    {stockListItems.map((item) => (
                        <li key={item.symbol} className="py-4">
                            <NextLink legacyBehavior href={`/stockdetails/${item.symbol}`}>
                                <a className="block">
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold text-gray-600">{item.symbol}</p>
                                        {item.error ? (
                                            <p className="text-red-500 text-sm">{item.error}</p>
                                        ) : (
                                            <div>
                                                {item.intradayPrice !== undefined && item.intradayPrice !== null && (
                                                    <p className="text-gray-500">${item.intradayPrice.toFixed(2)}</p>
                                                )}
                                                {item.percentageChange !== undefined && item.percentageChange !== null && (
                                                    <p className={`text-sm font-medium ${item.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {item.percentageChange.toFixed(2)}%
                                                        {item.percentageChange >= 0 ? ' ↗' : ' ↘'}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {item.lastDayClose !== undefined && item.lastDayClose !== null &&
                                        item.intradayPrice !== undefined && item.intradayPrice !== null &&
                                        !item.error && (
                                            <p className="text-gray-400 text-sm">
                                                vs last close: ${item.lastDayClose.toFixed(2)}
                                            </p>
                                        )}
                                </a>
                            </NextLink>
                        </li>
                    ))}
                </ul>
                {sortOrder !== null && (
                    <button
                        className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        onClick={() => {
                            setSortOrder(null);
                            fetchSymbolsAndData();
                        }}
                    >
                        Reset sorting
                    </button>
                )}
            </section>
        </DefaultLayout>
    );
};

export default StockListPage;