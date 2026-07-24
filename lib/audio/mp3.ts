/**
 * Kokoro's mp3 responses each carry their own ID3v2 tag (the ffmpeg/libav mux
 * Kokoro-FastAPI uses internally adds one to every clip). Left in, joining
 * several chunk buffers would embed a non-audio ID3 block in the middle of
 * the frame stream — decoders resync past it, but it's an avoidable click.
 * Stripping each chunk's tag first keeps the joined file a clean run of
 * MPEG frames, so a section assembled from N passage-level chunks plays
 * back as one gapless track.
 */
export function concatMp3(chunks: Buffer[]): Buffer {
  return Buffer.concat(chunks.map(stripId3v2));
}

function stripId3v2(buf: Buffer): Buffer {
  if (buf.length < 10 || buf.toString("latin1", 0, 3) !== "ID3") return buf;
  // Tag size is a 4-byte synchsafe integer (7 bits used per byte) at offset 6.
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  return buf.subarray(10 + size);
}
