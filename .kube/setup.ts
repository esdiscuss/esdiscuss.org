import createIngress from './createIngress';
import createServiceAccount from './createServiceAccount';
import createConfigMap from './createConfigMap';

export default [
  ...createServiceAccount({namespace: 'esdiscuss'}),
  ...createIngress({
    name: 'esdiscuss-staging',
    namespace: 'esdiscuss',
    serviceName: 'esdiscuss-staging',
    hosts: ['staging.esdiscuss.org'],
    createCertificate: true,
    enableTLS: true,
    stagingTLS: false,
  }),
  ...createIngress({
    name: 'esdiscuss-production',
    namespace: 'esdiscuss',
    serviceName: 'esdiscuss-production',
    hosts: ['esdiscuss.org'],
    createCertificate: true,
    enableTLS: true,
    stagingTLS: false,
  }),

  createConfigMap({
    name: 'esdiscuss-staging',
    namespace: 'esdiscuss',
    data: {
      NODE_ENV: 'production',
      BROWSERID_AUDIENCE: 'https://staging.esdiscuss.org',
    },
  }),
  createConfigMap({
    name: 'esdiscuss-production',
    namespace: 'esdiscuss',
    data: {
      NODE_ENV: 'production',
      BROWSERID_AUDIENCE: 'https://esdiscuss.org',
    },
  }),
];
