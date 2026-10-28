import { CastNav } from "@/components/CastNav";
import { requireCast } from "@/lib/auth";
import { cap } from "@/lib/config";
import { DetailsForm } from "./DetailsForm";

export default async function MyDetails() {
  const { member } = await requireCast();
  return (
    <>
      <CastNav active="/me/details" name={member.full_name} />
      <main className="mx-auto max-w-xl px-4 py-5 space-y-4">
        <h1 className="font-serif text-xl">My details</h1>
        <div className="rounded-xl bg-white border border-line p-4 text-sm space-y-1">
          <div><span className="text-muted">Email: </span>{member.email}</div>
          <div><span className="text-muted">Role: </span>{cap(member.role)}</div>
          <p className="text-xs text-muted pt-1">To change your email or role, contact the Flair team.</p>
        </div>
        <DetailsForm member={{ full_name: member.full_name, phone: member.phone, location: member.location, skills: member.skills }} />
        <div className="rounded-xl bg-beige p-4 text-sm">
          <b>Tip:</b> add this page to your home screen so it's one tap away. On iPhone, tap Share then "Add to Home Screen". On Android, tap the ⋮ menu then "Add to Home screen".
        </div>
      </main>
    </>
  );
}
