import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";

import { fetchStockData, StockData } from "@/utils/fetchStockData";
import DefaultLayout from "@/layouts/default";

const ApexChart = dynamic(() => import("react-apexcharts"), {
  // Use dynamic import
  ssr: false,
});

const StockDetailPage = () => {
  const router = useRouter();
  const { symbol: symbolQuery } = router.query;
  const symbol =
    typeof symbolQuery === "string"
      ? symbolQuery
      : Array.isArray(symbolQuery)
        ? symbolQuery[0]
        : ""; // get symbol string safely

  const [historyData, setHistoryData] = useState<StockData | null>(null);

  useEffect(() => {
    if (symbol) {
      const fetchData = async () => {
        let data: StockData | null = null;

        try {
          data = (await fetchStockData(symbol, "1d", "1mo")) as StockData; // 1 month now TODO, give option to look further in history
        } catch (e) {
          data = (await fetchStockData(symbol, "1d", "2mo")) as StockData;
        }
        setHistoryData(data); // set the history data
      };

      fetchData();
    }
  }, [symbol]);

  const ChartComponent = () => {
    interface ChartState {
      // define ChartState interface, options created problems when assigning
      series: ApexOptions["series"];
      options: ApexOptions;
    }

    const [state, setState] = useState<ChartState>({
      series: [
        {
          name: "STOCK " + symbol,
          data: [], // default is empty, fill this later with historyData
        },
      ],
      options: {
        chart: {
          type: "area",
          height: 350,
          zoom: {
            enabled: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: "straight",
        },
        title: {
          text: "Monthly change of the " + symbol + " stock ",
          align: "left",
        },
        subtitle: {
          text: "Price Movements",
          align: "left",
        },
        theme: {
          mode: "dark",
        },
        xaxis: {
          type: "datetime",
        },
        yaxis: {
          opposite: true,
        },
        legend: {
          horizontalAlign: "left",
        },
      },
    });

    useEffect(() => {
      if (historyData && !historyData.error) {
        // process the historyData to extract dates and prices for ApexCharts
        const timeSeriesKey = Object.keys(historyData).find(
          (key) => key.startsWith("Time Series") || key.includes("Series")
        );

        if (timeSeriesKey && historyData[timeSeriesKey]) {
          const timeSeries = historyData[timeSeriesKey];
          const dataPoints = Object.entries(timeSeries)
            .map(([date, values]: [string, any]) => {
              return [
                new Date(date).getTime(),
                parseFloat(
                  values["4. close"] || values["close"] || values["Close"]
                ),
              ];
            })
            .sort((a, b) => a[0] - b[0]); // Sort data points by date

          setState((prevState) => ({
            ...prevState,
            series: [
              {
                name: "STOCK " + symbol,
                data: dataPoints,
              },
            ],
          }));
        } else {
          console.error("Invalid history data format for chart:", historyData);
          // Handle error - maybe set an error state for the component
        }
      } else if (historyData && historyData.error) {
        console.error(
          "Error fetching history data for chart:",
          historyData.error
        );
        // Handle error - maybe set an error state for the component
      }
    }, [historyData, symbol]); // Effect dependency on historyData and symbol

    return (
      <div>
        <div id="chart">
          <ApexChart // Corrected line: options={state.options}
            height={350}
            options={state.options} // Use state.options for options prop
            series={state.series}
            type="area"
          />
        </div>
        <div id="html-dist" />
      </div>
    );
  };

  if (!symbol) {
    return <p>Loading symbol...</p>; // Or handle no symbol case appropriately
  }

  return (
    <DefaultLayout>
      <div>
        {historyData ? (
          historyData.error ? (
            <p className="text-red-500">
              Error loading data: {historyData.error}
            </p>
          ) : (
            <ChartComponent /> // Render the chart component when data is loaded
          )
        ) : (
          <p>Loading chart data...</p>
        )}
      </div>
    </DefaultLayout>
  );
};

export default StockDetailPage;
