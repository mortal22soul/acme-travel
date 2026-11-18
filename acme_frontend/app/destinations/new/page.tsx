import AddDestination from "@/components/destinations/AddDestination";

export const metadata = { title: "Add destination" };
export default function NewDestination() {
  return <section className="page-shell form-shell">
    <h1 className="travel-blue mb-5 text-center text-3xl font-bold sm:text-4xl">Add a new travel destination</h1>
    <AddDestination />
  </section>;
}
