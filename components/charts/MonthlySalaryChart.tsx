"use client";

import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyIncome {
  month: number;
  monthName: string;
  salary: number;
  bonus: number;
  freelance: number;
  investment: number;
  commission: number;
  other: number;
  total: number;
}

interface MonthlySalaryChartProps {
  data: MonthlyIncome[];
  avgMonthlySalary?: number;
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
      <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl min-w-[200px]">
        <p className="text-sm font-semibold text-white mb-3 border-b border-white/10 pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          entry.value > 0 && (
            <div key={index} className="flex items-center justify-between gap-4 text-sm py-1">
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
          )
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlySalaryChart({ data, avgMonthlySalary }: MonthlySalaryChartProps) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="monthName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            formatter={(value) => (
              <span className="text-zinc-400 text-sm">{value}</span>
            )}
          />
          <Bar dataKey="salary" name="Salary" stackId="income" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="bonus" name="Bonus" stackId="income" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="freelance" name="Freelance" stackId="income" fill="#06b6d4" radius={[0, 0, 0, 0]} />
          <Bar dataKey="investment" name="Investment" stackId="income" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="commission" name="Commission" stackId="income" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="other" name="Other" stackId="income" fill="#6b7280" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#ffffff"
            strokeWidth={2}
            dot={{ fill: "#ffffff", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlySalaryChart;
