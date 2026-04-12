type SupabaseServerConfig = {
  url: string;
  secretKey: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return {
    url,
    secretKey
  };
}
