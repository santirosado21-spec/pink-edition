import { redirect } from "next/navigation";
import { CLOUD } from "./supabase/config";
import { supabaseServer } from "./supabase/server";
import { profileDestination } from "./profile";

export async function requireAccount() {
  if (!CLOUD) redirect("/login");
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOnboarding() {
  const user = await requireAccount();
  const destination = await profileDestination();
  if (destination !== "/app") redirect(destination);
  return user;
}
