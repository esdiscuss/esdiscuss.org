const execa = require('execa');

const getSourceVersion = require('../utils/getSourceVersion');

async function buildDocker() {
  // ensure any TypeScript is built & all code is type-checked
  await execa(`yarn`, ['build'], {
    stdio: 'inherit',
  });


  const commitSHA = await getSourceVersion();
  await execa(
    'docker',
    [
      'build',
      `.`,
      `-t`,
      `esdiscuss:${commitSHA}`,
    ],
    {
      stdio: 'inherit',
      env: {...process.env, DOCKER_BUILDKIT: `1`},
    },
  );
  await execa(
    'docker',
    ['tag', `esdiscuss:${commitSHA}`, `esdiscuss:latest`],
    {
      stdio: 'inherit',
      env: {...process.env, DOCKER_BUILDKIT: `1`},
    },
  );
}

buildDocker().catch(ex => {
  console.error(ex.stack)
  process.exit(1)
})
