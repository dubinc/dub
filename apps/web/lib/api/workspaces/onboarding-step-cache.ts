import { OnboardingStep } from "@/lib/onboarding/types";
import { redis } from "@/lib/upstash";

const CACHE_KEY_PREFIX = "onboarding-step";
export const ONBOARDING_WINDOW_SECONDS = 60 * 60 * 24; // 24 hours

class OnboardingStepCache {
  async set({ userId, step }: { userId: string; step: OnboardingStep }) {
    return await redis.set(`${CACHE_KEY_PREFIX}:${userId}`, step, {
      ex: ONBOARDING_WINDOW_SECONDS,
    });
  }

  async mset({ userIds, step }: { userIds: string[]; step: OnboardingStep }) {
    const pipeline = redis.pipeline();
    userIds.forEach((userId) => {
      pipeline.set(`${CACHE_KEY_PREFIX}:${userId}`, step, {
        ex: ONBOARDING_WINDOW_SECONDS,
      });
    });
    return await pipeline.exec();
  }

  async get({ userId }: { userId: string }) {
    return await redis.get(`${CACHE_KEY_PREFIX}:${userId}`);
  }
}

export const onboardingStepCache = new OnboardingStepCache();
