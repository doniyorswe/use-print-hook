export {};

declare global {
  interface Window {
    __result: Record<string, unknown>;
  }
}
