/**
 * AES-GCM encryption/decryption for provider API keys.
 * Uses PROVIDER_KEY_ENCRYPTION_SECRET Edge Function secret as the master key.
 *
 * Encrypted format stored in DB: "enc:<base64iv>:<base64ciphertext>"
 * Plain keys (legacy, not starting with "enc:") are returned as-is for
 * backwards-compatibility and will be transparently re-encrypted on next save.
 */

const ENCRYPTION_PREFIX = "enc:";

async function getMasterKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("PROVIDER_KEY_ENCRYPTION_SECRET");
  if (!secret) {
    throw new Error("PROVIDER_KEY_ENCRYPTION_SECRET is not set");
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("smm-panel-provider-key-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) {
    // Already encrypted
    return plaintext;
  }
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ENCRYPTION_PREFIX}${ivB64}:${ctB64}`;
}

export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored.startsWith(ENCRYPTION_PREFIX)) {
    // Legacy plaintext key — return as-is
    return stored;
  }
  const withoutPrefix = stored.slice(ENCRYPTION_PREFIX.length);
  const colonIdx = withoutPrefix.indexOf(":");
  if (colonIdx === -1) throw new Error("Invalid encrypted key format");
  const ivB64 = withoutPrefix.slice(0, colonIdx);
  const ctB64 = withoutPrefix.slice(colonIdx + 1);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const key = await getMasterKey();
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}
