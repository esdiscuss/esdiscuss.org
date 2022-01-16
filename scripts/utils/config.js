const PROJECT_ID = `rollingsoftware`;
const REGION = `us-central1`;
const FULL_IMAGE_NAME = (tag) =>
  `us.gcr.io/${PROJECT_ID}/esdiscuss:${tag}`;

module.exports = {PROJECT_ID, REGION, FULL_IMAGE_NAME}