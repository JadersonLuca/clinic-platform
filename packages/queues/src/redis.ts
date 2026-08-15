import Redis from 'ioredis';

export function createQueueRedisConnection(redisUrl = process.env.REDIS_URL): Redis {
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}
