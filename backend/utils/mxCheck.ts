import dns from "dns";

export async function hasValidMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}
