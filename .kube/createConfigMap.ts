import ConfigMap from 'jskube/schema/configmap-v1';

export interface Options {
  namespace: string;
  name: string;

  data: {[name: string]: string};
}
export default function createConfigMap({
  name,
  namespace,
  data,
}: Options): ConfigMap {
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {name, namespace},
    data,
  };
}
