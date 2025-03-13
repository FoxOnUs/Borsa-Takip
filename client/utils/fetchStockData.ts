// src/utils/fetchStockData.ts
export interface StockData {
  symbol: string;
  interval: string;
  period: string;
  [key: string]: any;
  error?: string;
}

export const fetchStockData = async (
  symbol: string,
  interval: string,
  period: string
): Promise<StockData> => {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_BTAKIP_API_BASE_URL;
    const queryString = new URLSearchParams({ interval, period }).toString();

    console.log(
      `Fetching ${symbol} data with interval=${interval}, period=${period}`
    );
    const response = await fetch(
      `${apiBaseUrl}/stock/${symbol}?${queryString}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }

      console.error(
        `Error fetching ${symbol}: Status ${response.status}`,
        errorData
      );

      return {
        symbol,
        interval,
        period,
        error:
          errorData.error ||
          `Failed to fetch data: ${response.status} ${response.statusText}`,
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
        error: `Invalid JSON response: ${e.message}`,
      };
    }

    return {
      symbol,
      interval,
      period,
      ...data,
    };
  } catch (err: any) {
    console.error(`Network error fetching ${symbol}:`, err);

    return {
      symbol,
      interval,
      period,
      error: `Network error: ${err.message}`,
    };
  }
};
