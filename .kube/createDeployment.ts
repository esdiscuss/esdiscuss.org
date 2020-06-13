import Service from 'jskube/schema/service-v1';
import Deployment from 'jskube/schema/deployment-apps-v1';

export type Containers = Deployment['spec']['template']['spec']['containers'];
export type Container = Containers extends ReadonlyArray<infer Element>
  ? Partial<Element>
  : unknown;

export interface Options {
  namespace: string;
  name: string;

  replicaCount: number;
  containerPort: number;
  image: string;
  container?: Container;
  supportingContainers?: Containers;
}

export default function createDeployment({
  namespace,
  name,
  containerPort,
  replicaCount,
  image,
  container,
  supportingContainers,
}: Options) {
  const service: Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace,
    },
    spec: {
      ports: [{port: 80, targetPort: containerPort}],
      selector: {app: name},
    },
  };
  const deployment: Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
    },
    spec: {
      selector: {
        matchLabels: {
          app: name,
        },
      },
      replicas: replicaCount,
      template: {
        metadata: {
          labels: {
            app: name,
          },
        },
        spec: {
          affinity: {
            podAntiAffinity: {
              preferredDuringSchedulingIgnoredDuringExecution: [
                {
                  weight: 1,
                  podAffinityTerm: {
                    labelSelector: {
                      matchExpressions: [
                        {
                          key: 'app',
                          operator: 'In',
                          values: [name],
                        },
                      ],
                    },
                    topologyKey: 'kubernetes.io/hostname',
                  },
                },
              ],
            },
          },
          containers: [
            {
              ...container,
              name,
              image,
              ports: [{containerPort}],
              envFrom: [{secretRef: {name}}, {configMapRef: {name}}],
            },

            ...(supportingContainers || []),
          ],
        },
      },
    },
  };
  console.info(
    `To watch this deployment, run: kubectl rollout status deployment/${name} --namespace ${namespace}`,
  );
  return [service, deployment];
}
