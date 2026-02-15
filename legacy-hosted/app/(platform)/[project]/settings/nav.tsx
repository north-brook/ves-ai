"use client";

import { Box, CreditCard, KeyRound, Plug, Skull } from "lucide-react";
import SectionNav from "../section-nav";

export default function ProjectSettingsNav({
  projectSlug,
}: {
  projectSlug: string;
}) {
  return (
    <SectionNav
      name="Settings"
      items={[
        {
          name: "Project",
          link: `/${projectSlug}/settings`,
          icon: Box,
          exact: true,
        },
        {
          name: "Billing",
          link: `/${projectSlug}/settings/billing`,
          icon: CreditCard,
        },
        {
          name: "Team",
          link: `/${projectSlug}/settings/team`,
          icon: KeyRound,
        },
        {
          name: "Integrations",
          link: `/${projectSlug}/settings/integrations`,
          icon: Plug,
        },
        {
          name: "Danger",
          link: `/${projectSlug}/settings/danger`,
          icon: Skull,
        },
      ]}
    />
  );
}
