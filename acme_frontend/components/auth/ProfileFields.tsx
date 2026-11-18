import { Field } from "@/components/ui/fields";
import { todayUtc } from "@/lib/format";
import { valueOf } from "@/lib/use-form-request";

export type ProfileRole = "customer" | "agent";

export function profileValues(role: ProfileRole, form: FormData) {
  const phone = valueOf(form, "phone");
  if (role === "agent") return { phone, region: valueOf(form, "region") };
  return {
    phone,
    streetAddress1: valueOf(form, "streetAddress1"),
    streetAddress2: valueOf(form, "streetAddress2") || undefined,
    city: valueOf(form, "city"),
    zip: valueOf(form, "zip"),
    dob: valueOf(form, "dob"),
  };
}

export default function ProfileFields({ role }: { role: ProfileRole }) {
  return <fieldset className="grid min-w-0 gap-4">
    <legend className="mb-3 font-semibold">{role === "agent" ? "Agency profile" : "Traveler profile"}</legend>
    <Field label="Phone" name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={21} required />
    {role === "agent"
      ? <Field label="Region" name="region" autoComplete="address-level1" maxLength={80} required />
      : <>
        <Field label="Street address" name="streetAddress1" autoComplete="address-line1" maxLength={160} required />
        <Field label="Apartment or suite (optional)" name="streetAddress2" autoComplete="address-line2" maxLength={160} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" autoComplete="address-level2" maxLength={80} required />
          <Field label="Postal code" name="zip" autoComplete="postal-code" maxLength={20} required />
        </div>
        <Field label="Date of birth" name="dob" autoComplete="bday" type="date" min="1900-01-01" max={todayUtc()} required />
      </>}
  </fieldset>;
}
