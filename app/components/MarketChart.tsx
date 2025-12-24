'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
} from 'lightweight-charts';
export default function MarketChart({ symbol = 'SPY' }: { symbol?: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
        timeVisible: true,
        borderColor: '#334155',
      },
    });

    const series = chart.addSeries(LineSeries, {
  color: '#22c55e',
  lineWidth: 2,
});

    async function loadData() {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
      );

      const json = await res.json();
      const timeSeries = json['Time Series (Daily)'];

      if (!timeSeries) return;

      const data = Object.entries(timeSeries)
        .map(([date, values]: any) => ({
          time: date,
          value: parseFloat(values['4. close']),
        }))
        .reverse();

      series.setData(data);
    }

    loadData();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainerRef.current!.clientWidth,
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol]);

  return <div ref={chartContainerRef} style={{ width: '100%' }} />;
}
