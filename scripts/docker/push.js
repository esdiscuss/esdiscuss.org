const execa = require('execa');

const {FULL_IMAGE_NAME, PROJECT_ID} = require('../utils/config');
const getSourceVersion = require('../utils/getSourceVersion');

async function pushDocker() {
  const commitSHA = await getSourceVersion();

  const imageName = FULL_IMAGE_NAME(commitSHA);

  try {
    console.info(`docker auth`);
    await execa(`gcloud`, [
      `auth`,
      `configure-docker`,
      `--quiet`,
      `--project=${PROJECT_ID}`,
    ]);
  } catch (ex) {
    console.error(ex.stack);
    console.error(``);
    console.error(`Before retrying, run: gcloud init`);
    console.error(``);
    process.exit(1);
  }

  console.info(`check release does not already exist`);
  const existingRelease = await execa(`docker`, [`pull`, imageName], {
    reject: false,
  });
  if (existingRelease.exitCode === 0) {
    console.error(``);
    console.error(
      `There is already a release for ${imageName}. You must commit your changes before deploying.`,
    );
    console.error(``);
    process.exit(1);
  }

  console.info(`docker tag`);
  await execa(`docker`, [`tag`, `esdiscuss:${commitSHA}`, imageName], {
    stdio: 'inherit',
  });

  console.info(`docker push`);
  await execa(`docker`, [`push`, imageName], {stdio: 'inherit'});
}

pushDocker().catch(ex => {
  console.error(ex.stack)
  process.exit(1)
})
