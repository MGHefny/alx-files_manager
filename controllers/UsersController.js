import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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
        allData.insertOne({ email, password: hashapass });
        const newUser = await allData.findOne(
          { email }, { projection: { email: 1 } },
        );
        res.status(201).json({ id: newUser._id, email: newUser.email });
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
