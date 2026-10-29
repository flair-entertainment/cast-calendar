import { redirect } from "next/navigation";

// The old Overview calendar was removed: managers start on the Cast list.
export default function AdminHome() {
  redirect("/admin/cast");
}
