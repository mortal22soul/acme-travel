const stats = [
  { value: "10+", label: "Years of Experience" },
  { value: "12,000+", label: "Happy Clients" },
  { value: "4.8+", label: "Overall Rating" },
];

export default function Stats() {
  return <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-28">
    <h2 className="sr-only">ACME Travel in numbers</h2>
    <dl className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3 md:gap-8">
      {stats.map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center rounded-xl bg-card p-8 text-center shadow-sm after:order-3 after:mt-4 after:h-1 after:w-16 after:rounded-full after:bg-linear-to-r after:from-blue-400 after:to-cyan-400">
          <dt className="order-2 mt-4 text-lg font-semibold text-muted-foreground">{label}</dt>
          <dd className="travel-heading order-1 text-5xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  </section>;
}
