import { Users } from "lucide-react";
import { PageHeader } from "@/components/owner/page-header";
import { UsersClient } from "./users-client";
import { getProfiles } from "@/lib/supabase/queries";
import { getSessionRole } from "@/lib/auth/role";

/** Owner staff roster — live profiles. */
export default async function UsersPage() {
  const [profiles, session] = await Promise.all([getProfiles(), getSessionRole()]);

  if (profiles.error || !profiles.data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          icon={<Users className="size-5" aria-hidden="true" />}
          title="User/Role Management"
          subtitle="Staff accounts live in Supabase Auth + profiles."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {profiles.error ?? "Could not load users."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<Users className="size-5" aria-hidden="true" />}
        title="User/Role Management"
        subtitle="Staff accounts live in Supabase Auth + profiles."
      />
      <UsersClient initial={profiles.data} selfId={session?.userId ?? ""} />
    </div>
  );
}
