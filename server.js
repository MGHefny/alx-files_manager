/* api server */
import express from 'express';
import router from './routes/index';

const PORT = process.env.PORT || 5000;
const run = express();

run.use(express.json());
run.use('/', router);

run.listen(PORT, () => {
  console.log(`server running on PORT ${PORT}`);
});

export default run;
