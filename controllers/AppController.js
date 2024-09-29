/* api controller */
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static StGet(req, res) {
    res.status(200).json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(req, res) {
    const Nuser = await dbClient.nbUsers();
    const Nfiesl = await dbClient.nbFiles();
    res.status(200).json({ users: Nuser, files: Nfiesl });
  }
}

module.exports = AppController;
