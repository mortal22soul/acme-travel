import { getReviews } from "@/lib/public-api";

export default async function Reviews() {
  const items = await getReviews().catch(() => null);
  if (!items?.length) return null;
  return <section className="mx-auto max-w-7xl px-4 pb-20" aria-labelledby="traveler-reviews">
    <h2 className="sr-only" id="traveler-reviews">Traveler reviews</h2>
    <ul aria-label="Traveler reviews" tabIndex={0} className="review-strip flex snap-x gap-4 overflow-x-auto px-1 py-4 [scroll-padding-inline:0.25rem]">
      {items.map(item => <li key={item.id} className="w-[min(350px,85vw)] shrink-0 snap-start rounded-2xl border border-slate-700 bg-linear-to-b from-slate-800 to-slate-950 px-8 py-6 text-slate-100 md:w-[450px]">
        {item.comment && <blockquote className="text-sm leading-relaxed">{item.comment}</blockquote>}
        <h3 className="mt-5 font-medium text-slate-100">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-300">{item.rating} out of 5 stars</p>
      </li>)}
    </ul>
  </section>;
}
