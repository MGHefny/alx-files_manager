/* Create a new user */
import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    const allUser = dbClient.db.collection('users');
    allUser.findOne({ email }, (eror, infoU) => {
      if (infoU) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        const hashpass = sha1(password);
        allUser.insertOne(
          {
            email,
            password: hashpass,
          },
        ).then((output) => {
          res.status(201).json({ id: output.insertedId, email });
        }).catch((error) => console.log(error));
      }
    });
  }

  /* Authenticate a user */
  static async getMe(req, res) {
    const TokUser = req.header('X-Token');
    const UKey = `auth_${TokUser}`;
    const UId = await redisClient.get(UKey);
    if (UId) {
      const allUser = dbClient.db.collection('users');
      const OpjId = new ObjectID(UId);
      allUser.findOne({ _id: OpjId }, (eror, infoU) => {
        if (infoU) {
          res.status(200).json({ id: UId, email: infoU.email });
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      });
    } else {
      console.log('eror');
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = UsersController;
