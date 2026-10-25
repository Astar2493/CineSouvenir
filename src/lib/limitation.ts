import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lit UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();

export const QUOTA_GENERATIONS = 10;

export const limiteurGenerations = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(QUOTA_GENERATIONS, "1 h"),
  prefix: "fiches:generations",
});