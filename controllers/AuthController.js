/* Authenticate a user */
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  /* Authenticate a user connect */
  static async getConnect(req, res) {
    const infoAuth = req.header('Authorization');
    let EmUser = infoAuth.split(' ')[1];
    const useBuf = Buffer.from(EmUser, 'base64');
    EmUser = useBuf.toString('ascii');
    const info = EmUser.split(':');
    if (info.length !== 2) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hashpass = sha1(info[1]);
    const allUser = dbClient.db.collection('users');
    allUser.findOne({ email: info[0], password: hashpass }, async (eror, infoU) => {
      if (infoU) {
        const token = uuidv4();
        const UKey = `auth_${token}`;
        await redisClient.set(UKey, infoU._id.toString(), 60 * 60 * 24);
        res.status(200).json({ token });
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    });
  }

  /* Authenticate a user disconnect */
  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const UKey = `auth_${token}`;
    const iddU = await redisClient.get(UKey);
    if (iddU) {
      await redisClient.del(UKey);
      res.status(204).json({});
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = AuthController;
