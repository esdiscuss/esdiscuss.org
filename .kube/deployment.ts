import createDeployment from './createDeployment';

if (!['staging', 'production'].includes(process.env.ENVIRONMENT)) {
  console.error(
    'ENVIRONMENT should be set to either "staging" or "production"',
  );
  process.exit(1);
}
if (!process.env.DOCKERHUB_USERNAME) {
  console.error('DOCKERHUB_USERNAME must be specified');
  process.exit(1);
}
if (!process.env.CIRCLE_SHA1) {
  console.error('CIRCLE_SHA1 must be specified');
  process.exit(1);
}

export default createDeployment({
  namespace: 'esdiscuss',
  name: 'esdiscuss-' + process.env.ENVIRONMENT,
  containerPort: 3000,
  replicaCount: process.env.ENVIRONMENT === 'production' ? 2 : 1,
  image: `${process.env.DOCKERHUB_USERNAME}/esdiscuss:${process.env.CIRCLE_SHA1}`,
});
