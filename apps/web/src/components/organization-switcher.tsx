"use client";

import { useTransition } from "react";

type OrganizationOption = {
  id: string;
  name: string;
};

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrganizationOption[];
  activeOrganizationId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={activeOrganizationId}
      onChange={(event) => {
        const formData = new FormData();
        formData.set("organizationId", event.target.value);
        startTransition(async () => {
          await fetch("/app/organization/switch", {
            method: "POST",
            body: formData,
          });
          window.location.reload();
        });
      }}
      className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none"
      disabled={pending}
    >
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name}
        </option>
      ))}
    </select>
  );
}
