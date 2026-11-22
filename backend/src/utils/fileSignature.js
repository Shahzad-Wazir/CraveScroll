/**
 * Validates actual file magic bytes so attackers cannot spoof MIME types
 * by renaming malicious files to .mp4 or .jpg.
 */
function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return false;

  // MP4 / MOV / M4V: bytes 4..7 are ASCII "ftyp"
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp === 'ftyp') return true;

  // WebM / Matroska: EBML header 0x1A 0x45 0xDF 0xA3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return true;
  }

  return false;
}

function isValidImageBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // WebP: RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }

  return false;
}

module.exports = { isValidVideoBuffer, isValidImageBuffer };
