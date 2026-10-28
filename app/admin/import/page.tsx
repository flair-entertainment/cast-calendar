import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { LOCATIONS, ROLES } from "@/lib/config";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <>
      <AdminNav active="/admin/import" />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <h1 className="font-serif text-3xl">Add cast</h1>
        <div className="rounded-xl bg-white border border-line p-4 text-sm space-y-2">
          <p>Upload a spreadsheet saved as CSV, or paste it below. The first row must be the column names:</p>
          <pre className="rounded bg-sand p-2 text-xs overflow-x-auto">full_name,email,phone,roles,location,skills{"\n"}Ava Morgan,ava@example.com,07700 900123,dancer;actor,UK,ballet;tap</pre>
          <p className="text-muted">Roles: {ROLES.join(", ")} (more than one is fine, separated by semicolons). Locations: {LOCATIONS.join(", ")}, or leave blank. Separate skills with semicolons. Anyone already on the list is updated, not duplicated.</p>
          <p className="text-muted">Everyone added can log in straight away: they go to the site, enter their email and get a login link. Send them the site address once you've imported them.</p>
        </div>
        <ImportForm />
      </main>
    </>
  );
}
