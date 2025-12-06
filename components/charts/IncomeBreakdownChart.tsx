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
  Legend,
  Cell,
} from "recharts";

interface IncomeByType {
  salary: number;
  bonus: number;
  freelance: number;
  investment: number;
  commission: number;
  other: number;
}

interface IncomeBreakdownChartProps {
  data: IncomeByType;
}

const INCOME_COLORS = {
  salary: "#3b82f6",      // Blue
  bonus: "#8b5cf6",       // Purple
  freelance: "#06b6d4",   // Cyan
  investment: "#10b981",  // Emerald
  commission: "#f59e0b",  // Amber
  other: "#6b7280",       // Gray
};

const INCOME_LABELS = {
  salary: "Salary",
  bonus: "Bonus",
  freelance: "Freelance",
  investment: "Investment",
  commission: "Commission",
  other: "Other",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-1">{data.payload.name}</p>
        <p className="text-lg font-mono font-bold" style={{ color: data.payload.fill }}>
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function IncomeBreakdownChart({ data }: IncomeBreakdownChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: INCOME_LABELS[key as keyof typeof INCOME_LABELS],
      value,
      fill: INCOME_COLORS[key as keyof typeof INCOME_COLORS],
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-zinc-500">
        No income data available
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#e4e4e7", fontSize: 13, fontWeight: 500 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default IncomeBreakdownChart;
