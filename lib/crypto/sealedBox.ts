import sodium from "libsodium-wrappers-sumo";

let initialized = false;
let recipientPk: Uint8Array | null = null;
let recipientSk: Uint8Array | null = null;

const KDF_CONTEXT = "aiusage1";
const KDF_SUBKEY_ID = 1;

async function ensureReady(): Promise<void> {
  if (initialized && recipientPk && recipientSk) return;
  await sodium.ready;
  const masterB64 = process.env.MASTER_KEY;
  if (!masterB64) {
    throw new Error("sealedBox: MASTER_KEY not set");
  }
  const masterKey = sodium.from_base64(masterB64, sodium.base64_variants.ORIGINAL);
  if (masterKey.length !== 32) {
    throw new Error(`sealedBox: MASTER_KEY must decode to 32 bytes, got ${masterKey.length}`);
  }
  const seed = sodium.crypto_kdf_derive_from_key(32, KDF_SUBKEY_ID, KDF_CONTEXT, masterKey);
  const kp = sodium.crypto_box_seed_keypair(seed);
  recipientPk = kp.publicKey;
  recipientSk = kp.privateKey;
  initialized = true;
}

export async function seal(plaintext: string): Promise<Uint8Array> {
  await ensureReady();
  if (!recipientPk) throw new Error("sealedBox: not initialized");
  const message = sodium.from_string(plaintext);
  return sodium.crypto_box_seal(message, recipientPk);
}

export async function open(ciphertext: Uint8Array): Promise<string> {
  await ensureReady();
  if (!recipientPk || !recipientSk) {
    throw new Error("sealedBox: not initialized");
  }
  const opened = sodium.crypto_box_seal_open(ciphertext, recipientPk, recipientSk);
  return sodium.to_string(opened);
}

export function _resetForTests(): void {
  initialized = false;
  recipientPk = null;
  recipientSk = null;
}
