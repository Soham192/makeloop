import { describe, expect, it } from "vitest";
import { sniffImage, validateImage } from "./storage";
import { nextHintLevel } from "./ai";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("upload validation", () => {
  it("recognises image magic bytes", () => {
    expect(sniffImage(png)).toBe("png");
    expect(sniffImage(jpeg)).toBe("jpeg");
    expect(sniffImage(webp)).toBe("webp");
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
  });

  it("accepts a valid PNG", async () => {
    await expect(validateImage(new Blob([png], { type: "image/png" }))).resolves.toMatchObject({ kind: "png" });
  });

  it("rejects a file whose bytes are not an image even if the type says so", async () => {
    await expect(validateImage(new Blob(["<script>"], { type: "image/png" }))).rejects.toMatchObject({ status: 415 });
  });

  it("rejects disallowed types", async () => {
    await expect(validateImage(new Blob([png], { type: "image/gif" }))).rejects.toMatchObject({ status: 415 });
  });

  it("rejects files over 10 MB", async () => {
    const big = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" });
    await expect(validateImage(big)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects a missing file", async () => {
    await expect(validateImage(null)).rejects.toMatchObject({ status: 400 });
  });
});

describe("hint progression", () => {
  it("goes question → concept → direct and stays at 3", () => {
    expect([0, 1, 2, 3].map(nextHintLevel)).toEqual([1, 2, 3, 3]);
  });
});
