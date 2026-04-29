import { _resetForTests, open, seal } from "@/lib/crypto/sealedBox";
import { describe, expect, it } from "vitest";

describe("sealedBox", () => {
  it("round-trips plaintext", async () => {
    _resetForTests();
    const plaintext = "hello world — secret 🚀";
    const ciphertext = await seal(plaintext);
    const decoded = await open(ciphertext);
    expect(decoded).toBe(plaintext);
  });

  it("ciphertext differs from plaintext bytes", async () => {
    _resetForTests();
    const plaintext = "abcdefg";
    const ciphertext = await seal(plaintext);
    const ptBytes = new TextEncoder().encode(plaintext);
    expect(ciphertext.length).toBeGreaterThan(ptBytes.length);
    let identical = true;
    for (let i = 0; i < Math.min(ciphertext.length, ptBytes.length); i++) {
      if (ciphertext[i] !== ptBytes[i]) {
        identical = false;
        break;
      }
    }
    expect(identical).toBe(false);
  });

  it("tampered ciphertext throws on open", async () => {
    _resetForTests();
    const ciphertext = await seal("payload");
    const tampered = new Uint8Array(ciphertext);
    const lastIndex = tampered.length - 1;
    const last = tampered[lastIndex] ?? 0;
    tampered[lastIndex] = (last + 1) & 0xff;
    await expect(open(tampered)).rejects.toThrow();
  });
});
