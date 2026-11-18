import { notFound, redirect } from "next/navigation";
import { routeId } from "@/lib/format";
export default async function LegacyBooking({ params }: { params: Promise<{ id: string }> }) {
  const id = routeId((await params).id);
  if (!id) notFound();
  redirect(`/destinations/${id}`);
}
