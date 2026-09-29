export function formatBuildLabel(version: string, revision = ""): string {
  const label = version.startsWith("v") ? version : `v${version}`;
  return revision ? `${label} · ${revision}` : label;
}

export const BUILD_LABEL = formatBuildLabel(
  typeof __APP_VERSION__ === "string" && __APP_VERSION__ ? __APP_VERSION__ : "0.0.0",
  typeof __APP_REVISION__ === "string" ? __APP_REVISION__ : "",
);
