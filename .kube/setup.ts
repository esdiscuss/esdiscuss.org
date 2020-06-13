import createIngress from './createIngress';
import createServiceAccount from './createServiceAccount';
import createConfigMap from './createConfigMap';

export default [
  ...createServiceAccount({namespace: 'esdiscuss'}),
  ...createIngress({
    name: 'esdiscuss-staging',
    namespace: 'esdiscuss',
    serviceName: 'esdiscuss-staging',
    hosts: ['staging.esdicuss.org'],
    enableTLS: false,
    stagingTLS: true,
  }),
  ...createIngress({
    name: 'esdiscuss-production',
    namespace: 'esdiscuss',
    serviceName: 'esdiscuss-production',
    hosts: ['esdicuss.org'],
    enableTLS: false,
    stagingTLS: true,
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
