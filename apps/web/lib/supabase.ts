type SupabaseBrowserConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing Supabase browser environment variables");
  }

  return {
    url,
    publishableKey
  };
}
