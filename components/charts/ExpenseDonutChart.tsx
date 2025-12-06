"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface ExpenseCategory {
  name: string;
  amount: number;
}

interface ExpenseDonutChartProps {
  data: ExpenseCategory[];
}

const COLORS = [
  "#f43f5e", // Rose
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#84cc16", // Lime
];

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
        <p className="text-xs text-zinc-400">{data.payload.percentage}% of total</p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    percentage: ((item.amount / total) * 100).toFixed(1),
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-zinc-500">
        No expense data available
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="amount"
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={8}
            formatter={(value, entry: any) => (
              <span className="text-zinc-400 text-xs">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseDonutChart;
