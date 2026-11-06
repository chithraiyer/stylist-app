import { createAdmin } from "./supabase/server";

/** Short-lived links to private client photos. Only call after checking the viewer may see them. */
export async function signPhotos(paths: string[], seconds = 60 * 60): Promise<string[]> {
  if (!paths.length) return [];
  const admin = createAdmin();
  const { data } = await admin.storage.from("client-photos").createSignedUrls(paths, seconds);
  return (data || []).map((d) => d.signedUrl || "");
}

export function kbImageUrl(path: string | null) {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kb-images/${path}`;
}
