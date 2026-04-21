import type { ModuleSpec, PageSpec, PlatformSnapshot } from "@/lib/solva-data";

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchPlatformSnapshot() {
  return readJson<PlatformSnapshot>("/api/platform", { cache: "no-store" });
}

export function fetchModule(moduleKey: string) {
  return readJson<ModuleSpec>(`/api/modules/${moduleKey}`, { cache: "no-store" });
}

export function fetchPage(moduleKey: string, pageKey: string) {
  return readJson<PageSpec>(`/api/modules/${moduleKey}/pages/${pageKey}`, {
    cache: "no-store",
  });
}
