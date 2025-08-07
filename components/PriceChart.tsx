'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
} from 'recharts';
import { ChartCandle } from '@/lib/jupiter-api';

interface PriceChartProps {
  candles: ChartCandle[];
  showVolume?: boolean;
}

export default function PriceChart({ candles, showVolume = true }: PriceChartProps) {
  // Transform candles for recharts
  const chartData = candles.map((candle) => ({
    time: new Date(candle.time * 1000).toLocaleTimeString(),
    timestamp: candle.time,
    price: candle.close,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="text-sm font-semibold">{data.time}</p>
          <p className="text-sm">Open: ${data.open?.toFixed(8) || 'N/A'}</p>
          <p className="text-sm">High: ${data.high?.toFixed(8) || 'N/A'}</p>
          <p className="text-sm">Low: ${data.low?.toFixed(8) || 'N/A'}</p>
          <p className="text-sm">Close: ${data.close?.toFixed(8) || 'N/A'}</p>
          {showVolume && (
            <p className="text-sm">Volume: ${data.volume?.toLocaleString() || 'N/A'}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (value < 0.0001) {
      return value.toExponential(2);
    }
    return value.toFixed(8);
  };

  if (showVolume) {
    // Combined price and volume chart
    return (
      <div className="w-full space-y-4">
        {/* Price Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Price Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Volume Chart</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any) => `$${value?.toLocaleString() || 'N/A'}`}
              />
              <Bar dataKey="volume" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Simple line chart without volume
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}