/* Image Thumbnails */
import Bull from 'bull';
import { ObjectID } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import DBClient from './utils/db';

const Qfile = new Bull('fileQueue');
const Quser = new Bull('userQueue');
/* Thumbnail */
const makeThumb = async (PathF, locat) => {
  try {
    const thumbnail = await imageThumbnail(PathF, locat);
    const Pthumbnail = `${PathF}_${locat.width}`;

    fs.writeFileSync(Pthumbnail, thumbnail);
  } catch (error) {
    console.error('some thing error', error);
  }
};
/* file Queu */
Qfile.process(async (pros) => {
  const { fileId, userId } = pros.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const DocFile = await DBClient.db.collection('files').findOne({
    _id: ObjectID(fileId),
    userId: ObjectID(userId),
  });

  if (!DocFile) {
    throw new Error('File not found');
  }

  const Sthumbnail = [500, 250, 100];
  await Promise.all(Sthumbnail.map((size) => makeThumb(DocFile.localPath, { width: size })));
});
/* user Queu */
Quser.process(async (pros) => {
  const { userId } = pros.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const Docuesr = await DBClient.db.collection('users').findOne({ _id: ObjectID(userId) });

  console.log(`Welcome ${Docuesr.email}`);
});
