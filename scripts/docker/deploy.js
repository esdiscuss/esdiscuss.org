const execa = require('execa');

const {FULL_IMAGE_NAME, PROJECT_ID, REGION} = require('../utils/config');
const getSourceVersion = require('../utils/getSourceVersion');

const ENVIRONMENTS = ['staging', 'prod'];

async function deployDocker(env) {
  if (!ENVIRONMENTS.includes(env)) {
    console.error(`Environment must be one of ${ENVIRONMENTS.join(`, `)}`)
    process.exit(1)
  }
  const commitSHA = await getSourceVersion();
  const imageName = FULL_IMAGE_NAME(commitSHA);

  console.info(`gcloud run deploy`);
  await execa(
    `gcloud`,
    [
      `run`,
      `deploy`,
      `esdiscuss-${env}`,
      `--image`,
      imageName,
      `--region`,
      REGION,
      `--platform`,
      `managed`,
      `--project=${PROJECT_ID}`,
    ],
    {
      stdio: 'inherit',
    },
  );
}

deployDocker(process.argv[2]).catch(ex => {
  console.error(ex.stack)
  process.exit(1)
})
