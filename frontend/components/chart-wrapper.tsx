"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamically import the chart with no SSR
const DynamicChart = dynamic(() => import("./ui/chart").then((m) => m.ChartContainer as any), { 
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
})

export { DynamicChart }
