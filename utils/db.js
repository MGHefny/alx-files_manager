/* MongoDB utils */
import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.BD_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const URI = `mongodb://${host}:${port}`;
    this.ClMongo = new MongoClient(URI, { useUnifiedTopology: true });
    this.ClMongo.connect((eror) => {
      if (!eror) this.db = this.ClMongo.db(database);
    });
  }

  isAlive() {
    return this.ClMongo.isConnected();
  }

  async nbUsers() {
    const allUser = this.db.collection('users');
    const numU = await allUser.countDocuments();
    return numU;
  }

  async nbFiles() {
    const allFile = this.db.collection('files');
    const numF = await allFile.countDocuments();
    return numF;
  }

  async close() {
    await this.ClMongo.close();
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
