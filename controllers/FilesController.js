/* file controller */
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async getUser(req) {
    const token = req.header('X-Token');
    const UKey = `auth_${token}`;
    const UId = await redisClient.get(UKey);
    if (UId) {
      const allUser = dbClient.db.collection('users');
      const OpjId = new ObjectID(UId);
      const infoU = await allUser.findOne({ _id: OpjId });
      if (!infoU) {
        return null;
      }
      return infoU;
    }
    return null;
  }

  /* First file */
  static async postUpload(req, res) {
    const infoU = await FilesController.getUser(req);
    if (!infoU) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name } = req.body;
    const { type } = req.body;
    const { parentId } = req.body;
    const isPublic = req.body.isPublic || false;
    const { data } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const files = dbClient.db.collection('files');
    if (parentId) {
      const OpjId = new ObjectID(parentId);
      const file = await files.findOne({ _id: OpjId, userId: infoU._id });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      files.insertOne(
        {
          userId: infoU._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        },
      ).then((result) => res.status(201).json({
        id: result.insertedId,
        userId: infoU._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
      })).catch((error) => {
        console.log(error);
      });
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const Nfile = `${filePath}/${uuidv4()}`;
      const Ubuf = Buffer.from(data, 'base64');
      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
          console.log(error);
        }
        await fs.writeFile(Nfile, Ubuf, 'utf-8');
      } catch (error) {
        console.log(error);
      }
      files.insertOne(
        {
          userId: infoU._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: Nfile,
        },
      ).then((result) => {
        res.status(201).json(
          {
            id: result.insertedId,
            userId: infoU._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          },
        );
      }).catch((error) => console.log(error));
    }
    return null;
  }

  /* Get and list file */
  static async getShow(req, res) {
    const infoU = await FilesController.getUser(req);
    if (!infoU) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const OpjId = new ObjectID(fileId);
    const file = await files.findOne({ _id: OpjId, userId: infoU._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(file);
  }

  /* File publish/unpublish */
  static async getIndex(req, res) {
    const infoU = await FilesController.getUser(req);
    if (!infoU) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      parentId,
      page,
    } = req.query;
    const pageNum = page || 0;
    const files = dbClient.db.collection('files');
    let query;
    if (!parentId) {
      query = { userId: infoU._id };
    } else {
      query = { userId: infoU._id, parentId: ObjectID(parentId) };
    }
    files.aggregate(
      [
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }, { $addFields: { page: parseInt(pageNum, 10) } }],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ],
    ).toArray((eror, result) => {
      if (result) {
        const final = result[0].data.map((file) => {
          const tmpFile = {
            ...file,
            id: file._id,
          };
          delete tmpFile._id;
          delete tmpFile.localPath;
          return tmpFile;
        });
        return res.status(200).json(final);
      }
      console.log('Error occured');
      return res.status(404).json({ error: 'Not found' });
    });
    return null;
  }

  /* File publish */
  static async putPublish(req, res) {
    const infoU = await FilesController.getUser(req);
    if (!infoU) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const OpjId = new ObjectID(id);
    const Nvalu = { $set: { isPublic: true } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate({ _id: OpjId, userId: infoU._id }, Nvalu, options, (eror, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(file.value);
    });
    return null;
  }

  /* File unpublish */
  static async putUnpublish(req, res) {
    const infoU = await FilesController.getUser(req);
    if (!infoU) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const OpjId = new ObjectID(id);
    const Nvalu = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate({ _id: OpjId, userId: infoU._id }, Nvalu, options, (eror, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(file.value);
    });
    return null;
  }

  /* File data */
  static async getFile(req, res) {
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const OpjId = new ObjectID(id);
    files.findOne({ _id: OpjId }, async (eror, file) => {
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }
      console.log(file.localPath);
      if (file.isPublic) {
        if (file.type === 'folder') {
          return res.status(400).json({ error: "A folder doesn't have content" });
        }
        try {
          let Nfile = file.localPath;
          const size = req.param('size');
          if (size) {
            Nfile = `${file.localPath}_${size}`;
          }
          const data = await fs.readFile(Nfile);
          const contentType = mime.contentType(file.name);
          return res.header('Content-Type', contentType).status(200).send(data);
        } catch (error) {
          console.log(error);
          return res.status(404).json({ error: 'Not found' });
        }
      } else {
        const infoU = await FilesController.getUser(req);
        if (!infoU) {
          return res.status(404).json({ error: 'Not found' });
        }
        if (file.userId.toString() === infoU._id.toString()) {
          if (file.type === 'folder') {
            return res.status(400).json({ error: "A folder doesn't have content" });
          }
          try {
            let Nfile = file.localPath;
            const size = req.param('size');
            if (size) {
              Nfile = `${file.localPath}_${size}`;
            }
            const contentType = mime.contentType(file.name);
            return res.header('Content-Type', contentType).status(200).sendFile(Nfile);
          } catch (error) {
            console.log(error);
            return res.status(404).json({ error: 'Not found' });
          }
        } else {
          console.log(`user error: file.userId=${file.userId}; userId=${infoU._id}`);
          return res.status(404).json({ error: 'Not found' });
        }
      }
    });
  }
}

module.exports = FilesController;
