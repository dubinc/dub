import { UserProps } from "@/lib/types";
import { redis } from "@/lib/upstash";

export async function getOnboardingStep(user: UserProps) {
  return await redis.get(`onboarding-step:${user.id}`);
}
