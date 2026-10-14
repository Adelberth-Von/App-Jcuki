const { existsSync } = require("node:fs");
module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_FILE || "./google-services.json";
  if (process.env.GOOGLE_SERVICES_FILE && !existsSync(googleServicesFile))
    throw new Error("Firebase client config file is missing");
  if (
    projectId &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      projectId,
    )
  )
    throw new Error("Invalid public EAS project ID");
  return {
    ...config,
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    android: {
      ...config.android,
      ...(existsSync(googleServicesFile) ? { googleServicesFile } : {}),
    },
  };
};
