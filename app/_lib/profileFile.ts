import { promises as fs } from "node:fs";
import path from "node:path";
import { ProfileError, ProfileReadError, storedPreferences } from "./profileState";

export const profileFile = () => path.join(/* turbopackIgnore: true */ process.cwd(), "work", "_profile.json");

export async function readProfileFile(file = profileFile()) {
  let text: string;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new ProfileReadError();
  }
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new ProfileError(["El archivo no contiene JSON válido."]); }
  return storedPreferences(value);
}
