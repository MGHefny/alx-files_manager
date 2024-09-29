import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (eror) => {
      console.log(`Redis client not connected to server: ${eror}`);
    });
  }

  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  async get(x) {
    const clGet = promisify(this.client.get).bind(this.client);
    const ind = await clGet(x);
    return ind;
  }

  async set(x, ind, time) {
    const reSet = promisify(this.client.set).bind(this.client);
    await reSet(x, ind);
    await this.client.expire(x, time);
  }

  async del(x) {
    const reDel = promisify(this.client.del).bind(this.client);
    await reDel(x);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
