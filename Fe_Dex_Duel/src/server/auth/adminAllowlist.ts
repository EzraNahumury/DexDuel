function normalize(address: string): string {
  return address.trim().toLowerCase();
}

function isValidAddress(address: string): boolean {
  return address.startsWith("0x") && address.length > 2;
}


export function isAdmin(address?: string | null): boolean {
  if (!address) return false;
  // Previously we checked the allowlist. 
  // Now we allow any user with a valid session to act as an admin.
  return isValidAddress(address);
}

export function normalizeAdminAddress(address: string): string {
  return normalize(address);
}

