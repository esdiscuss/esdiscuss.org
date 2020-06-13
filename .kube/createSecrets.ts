import Secret from 'jskube/schema/secret-v1';

export interface Options {
  namespace: string;
  name: string;

  data: {[name: string]: string};
}
export default function createSecret({name, namespace, data}: Options): Secret {
  const encodedData = {};
  for (const key of Object.keys(data)) {
    encodedData[key] = Buffer.from(data[key]).toString('base64');
  }
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    type: 'Opaque',
    metadata: {name, namespace},
    data: encodedData,
  };
}
