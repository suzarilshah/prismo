"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DailyData {
  day: number;
  date: string;
  income: number;
  expenses: number;
  net: number;
}

interface DailySpendingChartProps {
  data: DailyData[];
  avgDailySpending?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-2">Day {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-zinc-400">{entry.name}</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: entry.color }}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DailySpendingChart({ data, avgDailySpending }: DailySpendingChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 11 }}
            interval={4}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          {avgDailySpending && (
            <ReferenceLine
              y={avgDailySpending}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${formatCurrency(avgDailySpending)}`,
                position: "insideTopRight",
                fill: "#f59e0b",
                fontSize: 11,
              }}
            />
          )}
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="income"
            name="Income"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DailySpendingChart;
