import Ingress from 'jskube/schema/ingress-extensions-v1beta1';

export interface Options {
  name: string;
  namespace: string;
  hosts: string[];
  serviceName?: string;
  enableTLS: boolean;
  stagingTLS: boolean;
}
export default function createIngress({
  name,
  namespace,

  hosts,

  serviceName,
  enableTLS,
  stagingTLS,
}: Options) {
  const secretName = `${name}-tls-secret`;
  const ingress: Ingress = {
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
    },
    spec: {
      ...(enableTLS
        ? {
            tls: [{hosts, secretName}],
          }
        : {}),
      rules: hosts.map((host) => ({
        host,
        http: {
          paths: [
            {backend: {serviceName: serviceName || name, servicePort: 80}},
          ],
        },
      })),
    },
  };
  const certificate = {
    apiVersion: 'cert-manager.io/v1alpha2',
    kind: 'Certificate',
    metadata: {
      name,
      namespace,
    },
    spec: {
      secretName,
      issuerRef: {
        name: stagingTLS ? 'letsencrypt-staging' : 'letsencrypt-prod',
        kind: 'ClusterIssuer',
      },
      dnsNames: hosts,
    },
  };
  if (enableTLS) {
    console.info(
      `To check certificate status, run: kubectl describe certificate ${name} --namespace ${namespace}`,
    );
  }
  return [ingress, ...(enableTLS ? [certificate] : [])];
}
