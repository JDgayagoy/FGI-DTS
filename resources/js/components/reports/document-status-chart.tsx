import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { type DocumentStatusDist } from '@/pages/reports/types';

const chartConfig = {
  value: {
    label: "Documents",
  },
  Approved: {
    label: "Approved",
    color: "#22c55e",
  },
  Pending: {
    label: "Pending",
    color: "#eab308",
  },
  Rejected: {
    label: "Rejected",
    color: "#ef4444",
  },
} satisfies ChartConfig

export function DocumentStatusChart({ data }: { data: DocumentStatusDist[] }) {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const totalDocuments = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0)
  }, [data])

  const approvedDocs = data.find(d => d.name === 'Approved')?.value || 0;
  const approvedRate = totalDocuments > 0 ? Math.round((approvedDocs / totalDocuments) * 100) : 0;

  if (!isClient) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5 h-[300px] flex items-center justify-center">
        <div className="flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-800" />
      </div>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    fill: d.color
  }))

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5 flex flex-col justify-between">
      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2">Distribution of Document Status</p>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[220px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            strokeWidth={10}
            cornerRadius={6}
            paddingAngle={2}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-black tracking-tighter"
                      >
                        {approvedRate}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground text-[10px] font-bold uppercase tracking-widest"
                      >
                        Approved
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
        {data.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span>{d.name}</span>
                <span className="ml-auto text-slate-400 font-bold">{d.value.toLocaleString()}</span>
            </span>
        ))}
      </div>
    </div>
  )
}