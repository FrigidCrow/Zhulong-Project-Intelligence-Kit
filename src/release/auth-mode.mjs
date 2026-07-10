export function selectNpmAuthMode({ versionExists, packageExists, hasBootstrapToken }) {
  if (versionExists) throw new Error("package version is already published and immutable");
  if (packageExists) return "trusted";
  if (hasBootstrapToken) return "bootstrap";
  throw new Error("first publish requires the one-time NPM_BOOTSTRAP_TOKEN secret");
}
