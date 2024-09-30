/* Create a new user */
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
    }

    const hashapass = sha1(password);

    try {
      const allData = dbClient.db.collection('users');
      const infoU = await allData.findOne({ email });

      if (infoU) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        await allData.insertOne({ email, password: hashapass }).then((output) => {
          res.status(201).json({ id: output.insertedId, email });
          userQueue.add({ id: output.insertedId });
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'error server not res' });
    }
  }

  static async getMe(req, res) {
    try {
      const TokUser = req.header('X-Token');
      const UKey = `auth_${TokUser}`;
      const UId = await redisClient.get(UKey);
      if (!UId) {
        res.status(401).json({ error: 'Unauthorized' });
      }
      const Usr = await dbClient.getUser({ _id: ObjectId(UId) });
      res.json({ id: Usr._id, email: Usr.email });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'error server not res' });
    }
  }
}

export default UsersController;
