// components/product-detail-client.tsx
"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { postsApi } from "@/lib/api-client"
import { ipfsImageUrl } from "@/lib/ipfs"
import { Loader2 } from "lucide-react"

interface TaskDetailClientProps {
  taskId: string
}

export function TaskDetailClient({ taskId }: TaskDetailClientProps) {
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        // Debug log
        setLoading(true)
        const response = await postsApi.getById(taskId)
        // Debug log
        if (response.success) {
          setTask(response.data)
        } else {
          setError(response.message || "Failed to fetch task")
        }
      } catch (err) {
        // Detailed error logging
        setError("Failed to fetch task")
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [taskId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading task...</span>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-red-600">{error || "Task not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-12 px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold mb-4">{task.Title}</h1>
          <img
            src={ipfsImageUrl(task.ImgCid || task.image)}
            alt={task.Title}
            className="w-full h-96 object-cover rounded-lg mb-6"
          />
          <div className="space-y-4">
            <p>
              <strong>Type:</strong> {task.Type}
            </p>
            <p>
              <strong>Description:</strong> {task.Description}
            </p>
            <p>
              <strong>Location:</strong> {task.Location}
            </p>
            <p>
              <strong>Need Amount:</strong> {task.NeedAmount}
            </p>
            <p>
              <strong>Wallet Address:</strong> {task.WalletAddr}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
