import { redirect } from "next/navigation"
export default function CommunityIdPage({ params }: { params: { id: string } }) {
  redirect(`/product/${params.id}`)
}
