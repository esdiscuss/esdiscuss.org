import createSecret from './createSecrets';

// To set secrets:
//   - create `secrets.ts` in this folder
//   - run `jskube .kube/secrets.ts`
//   - delete `secrets.ts`
// The code for `secrets.ts` is in 1password
interface Secrets {
  ALGOLIA_ADMIN_KEY: string;
  ALGOLIA_APPLICATION_ID: string;
  ALGOLIA_SEARCH_KEY: string;

  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  GITHUB_AUTH_TOKEN: string;

  COOKIE_SECRET: string;
  
  MONGO_USER: string;
  MONGO_PASS: string;
}
export default function secrets(data: {staging: Secrets; production: Secrets}) {
  return [
    createSecret({
      name: 'esdiscuss-staging',
      namespace: 'esdiscuss',
      data: data.staging as any,
    }),
    createSecret({
      name: 'esdiscuss-production',
      namespace: 'esdiscuss',
      data: data.production as any,
    }),
  ];
}
