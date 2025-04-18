/**
 * Utility functions for fetching Zod type definitions
 */

/**
 * Fetches the Zod type definitions from CDN for a specific version
 * @param ver The Zod version to fetch type definitions for
 * @returns A promise that resolves to the type definitions as a string
 */
export async function getDeclarationTypes(ver: string): Promise<string> {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/zod@${ver}/lib/types.d.ts`)
  return await res.text()
}
