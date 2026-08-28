"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function WeeklyActivityChart({ data }: { data: { day: string; appointments: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d7" vertical={false} />
          <XAxis dataKey="day" stroke="#434655" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#434655" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #c3c6d7", fontSize: 13 }}
          />
          <Bar dataKey="appointments" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
