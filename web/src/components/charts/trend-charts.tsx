"use client";

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
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import type { MonthlyTrendPoint, UnitComparisonRow } from "@/lib/monthly-trend";

const EMERALD = "#059669";
const AMBER = "#d97706";
const RED = "#dc2626";
const SKY = "#0284c7";

export function MonthlyTrendChart({
  data,
  height = 240,
  target = 100,
  showTargetLine = true,
}: {
  data: MonthlyTrendPoint[];
  height?: number;
  target?: number;
  showTargetLine?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500"
        style={{ height }}
      >
        Tidak ada data trend.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="pctGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          formatter={(value, name) => {
            if (name === "pct" && typeof value === "number")
              return [`${value.toFixed(1)}%`, "Pencapaian"];
            return [String(value ?? ""), String(name)];
          }}
        />
        {showTargetLine && (
          <ReferenceLine
            y={target}
            stroke={AMBER}
            strokeDasharray="4 4"
            label={{
              value: `Target ${target}%`,
              position: "insideTopRight",
              fill: AMBER,
              fontSize: 10,
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="pct"
          stroke={EMERALD}
          strokeWidth={2.5}
          fill="url(#pctGrad)"
          dot={{ r: 3, fill: EMERALD, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyAchievedChart({
  data,
  height = 200,
}: {
  data: MonthlyTrendPoint[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500"
        style={{ height }}
      >
        Tidak ada data.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#0f172a", fontWeight: 600 }}
        />
        <Bar
          dataKey="achievedCount"
          name="Tercapai"
          fill={EMERALD}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="totalCount"
          name="Total"
          fill="#cbd5e1"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UnitComparisonChart({
  data,
  height = 280,
  target = 100,
}: {
  data: UnitComparisonRow[];
  height?: number;
  target?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500"
        style={{ height }}
      >
        Tidak ada data unit.
      </div>
    );
  }
  function barColor(pct: number): string {
    if (pct >= target) return EMERALD;
    if (pct >= target * 0.8) return AMBER;
    return RED;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="unitCode"
          tick={{ fontSize: 11, fill: "#0f172a", fontWeight: 600 }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          formatter={(value, _name, item) => {
            const payload = (item as { payload?: UnitComparisonRow })?.payload;
            const v = typeof value === "number" ? value : Number(value ?? 0);
            const pctLabel = `${v.toFixed(1)}%`;
            const detail = payload
              ? ` · ${payload.achievedCount}/${payload.totalCount} indikator tercapai`
              : "";
            return [pctLabel + detail, "Pencapaian"];
          }}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as UnitComparisonRow | undefined;
            return p ? `${p.unitCode} · ${p.unitName}` : "";
          }}
        />
        <ReferenceLine
          x={target}
          stroke={AMBER}
          strokeDasharray="4 4"
          label={{
            value: `${target}%`,
            position: "top",
            fill: AMBER,
            fontSize: 10,
          }}
        />
        <Bar
          dataKey="pct"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        >
          {data.map((row, idx) => (
            <Cell key={idx} fill={barColor(row.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
