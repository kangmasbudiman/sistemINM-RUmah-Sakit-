"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyTrendPoint = {
  day: number;
  num: number;
  den: number;
  pct: number;
};

export type IndicatorBarRow = {
  id: string;
  code: string;
  title: string;
  pct: number;
  target: number;
  achieved: boolean;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string | number;
};

const TOOLTIP_STYLE = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "0.5rem",
  fontSize: "12px",
  padding: "8px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

export function DailyTrendChart({
  data,
  target,
}: {
  data: DailyTrendPoint[];
  target: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => {
            const v = Number(value) || 0;
            if (name === "pct") return [`${v.toFixed(1)}%`, "Pencapaian"];
            if (name === "num") return [v, "Pembilang"];
            if (name === "den") return [v, "Penyebut"];
            return [v, name as string];
          }}
          labelFormatter={(d) => `Tanggal ${d}`}
        />
        <ReferenceLine
          y={target}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Target ${target}%`,
            position: "insideTopRight",
            fontSize: 10,
            fill: "#d97706",
          }}
        />
        <Area
          type="monotone"
          dataKey="pct"
          stroke="#059669"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: "#059669", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AchievementDonut({
  achieved,
  total,
}: {
  achieved: number;
  total: number;
}) {
  const notAchieved = Math.max(0, total - achieved);
  const data = [
    { name: "Tercapai", value: achieved, color: "#10b981" },
    { name: "Belum", value: notAchieved, color: "#e2e8f0" },
  ];
  const pct = total === 0 ? 0 : Math.round((achieved / total) * 100);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={achieved === 0 || notAchieved === 0 ? 0 : 2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [Number(value) || 0, name as string]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-slate-900">{pct}%</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          Tercapai
        </div>
      </div>
    </div>
  );
}

export function IndicatorBarChart({
  data,
  target,
}: {
  data: IndicatorBarRow[];
  target: number;
}) {
  const sorted = [...data].sort((a, b) => a.pct - b.pct);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
        barSize={18}
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="code"
          tick={{ fontSize: 10, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
          width={84}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, _name, item: any) => [
            `${(Number(value) || 0).toFixed(1)}%`,
            item?.payload?.title ?? "",
          ]}
          labelFormatter={() => ""}
        />
        <ReferenceLine
          x={target}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
          {sorted.map((row) => (
            <Cell
              key={row.id}
              fill={row.achieved ? "#10b981" : "#f87171"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
