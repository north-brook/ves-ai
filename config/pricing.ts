import { ProjectPlan } from "@/types";

export const PLANS: {
  id: ProjectPlan;
  name: string;
  workers: string;
  sessions: string;
  cost: string;
  priceId?: string;
  description: string;
  popular?: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    workers: "5 concurrent workers",
    sessions: "100 monthly sessions",
    cost: "$0",
    description: "Early-stage startups",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    id: "growth",
    name: "Growth",
    workers: "20 concurrent workers",
    sessions: "1,000 monthly sessions",
    cost: "$500",
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
    description: "Startups with PMF",
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    workers: "100 concurrent workers",
    sessions: "10,000 monthly sessions",
    cost: "$2,000",
    priceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
    description: "Companies operating at scale",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    workers: "Unlimited workers",
    sessions: "Unlimited monthly sessions",
    cost: "Custom",
    description: "Large orgs with special needs",
  },
];
