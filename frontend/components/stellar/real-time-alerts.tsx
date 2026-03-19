"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { getPosts } from "@/lib/api-service"

export function RealTimeAlerts() {
    const { toast } = useToast()
    const lastSealedCountRef = useRef<number | null>(null)

    useEffect(() => {
        // Initial load to establish baseline
        checkNewMissions(true)

        // Poll every 30 seconds for completed missions
        const interval = setInterval(() => {
            checkNewMissions()
        }, 30000)

        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const checkNewMissions = async (isInitial = false) => {
        try {
            const response = await getPosts()
            if (response.success && Array.isArray(response.data)) {
                const completedMissions = response.data.filter(p => p.Status === "Completed")

                if (isInitial) {
                    lastSealedCountRef.current = completedMissions.length
                    return
                }

                if (lastSealedCountRef.current !== null && completedMissions.length > lastSealedCountRef.current) {
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
            }
        } catch {
            // Silently ignore polling errors
        }
    }

    return null
}
