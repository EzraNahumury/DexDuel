export type DexDuelConfig = {
  packageId: string;
  moduleName: string;
  createFn: string;
  cancelFn: string;
};

const DEFAULTS: DexDuelConfig = {
  packageId: process.env.DEXDUEL_PACKAGE_ID ?? process.env.NEXT_PUBLIC_PACKAGE_ID ?? "",
  moduleName: process.env.DEXDUEL_MODULE_NAME ?? "dexduel",
  createFn: process.env.DEXDUEL_CREATE_FN ?? "create_tournament",
  cancelFn: process.env.DEXDUEL_CANCEL_FN ?? "cancel_tournament",
};

export function getDexDuelConfig(): DexDuelConfig {
  return {
    packageId: DEFAULTS.packageId.trim(),
    moduleName: DEFAULTS.moduleName.trim(),
    createFn: DEFAULTS.createFn.trim(),
    cancelFn: DEFAULTS.cancelFn.trim(),
  };
}

export function requireDexDuelPackageId(): string {
  const config = getDexDuelConfig();
  if (!config.packageId) {
    throw new Error("DEXDUEL_PACKAGE_ID is not configured");
  }
  return config.packageId;
}