"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { getPosts } from "@/lib/api-service"

export function RealTimeAlerts() {
    const { toast } = useToast()
    const lastSealedCountRef = useRef<number | null>(null)

    const { data: posts } = useQuery({
        queryKey: ["real-time-posts"],
        queryFn: async () => {
            const response = await getPosts()
            return response.success && Array.isArray(response.data) ? response.data : []
        },
        refetchInterval: 30000,
        staleTime: 30000,
    })

    useEffect(() => {
        if (!posts) return

        const completedMissions = posts.filter((p: any) => p.Status === "Completed")

        // Initial load to establish baseline
        if (lastSealedCountRef.current === null) {
            lastSealedCountRef.current = completedMissions.length
            return
        }

        // Check for new missions
        if (completedMissions.length > lastSealedCountRef.current) {
            const newMission = completedMissions[0]

            toast({
                title: "Mission Completed",
                description: (
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-xs font-semibold text-amber-400 tracking-tight">
                            {newMission.Title || newMission.title}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            Campaign goal reached successfully.
                        </p>
                    </div>
                ),
                variant: "default",
                className: "bg-zinc-950 border border-zinc-800 text-white",
            })

            lastSealedCountRef.current = completedMissions.length
        }
    }, [posts, toast])

    return null
}
