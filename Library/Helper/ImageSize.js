const fs = require('fs');

//Supports PNG, JPEG (SOF0–SOF3), GIF (87a/89a), BMP, WEBP (VP8/VP8L/VP8X) and ICO (first icon entry).
function getImageSize(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width:  buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  if (buffer.readUInt16BE(0) === 0xFFD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] === 0xFF) {
        const marker = buffer[offset + 1];
        const len    = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xC0 && marker <= 0xC3) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width:  buffer.readUInt16BE(offset + 7)
          };
        }
        offset += 2 + len;
      } else {
        offset++;
      }
    }
  }

  const gifHdr = buffer.toString('ascii', 0, 6);
  if (gifHdr === 'GIF87a' || gifHdr === 'GIF89a') {
    return {
      width:  buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8)
    };
  }

  if (buffer.toString('ascii', 0, 2) === 'BM') {
    return {
      width:  buffer.readUInt32LE(18),
      height: buffer.readUInt32LE(22)
    };
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buffer.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') {
      return {
        width:  buffer.readUInt16LE(26),
        height: buffer.readUInt16LE(28)
      };
    } else if (fmt === 'VP8L') {
      const b0 = buffer[21], b1 = buffer[22],
            b2 = buffer[23], b3 = buffer[24];
      const width  = ((b1 & 0x3F) << 8) | b0   + 1;
      const height = ((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6) + 1;
      return { width, height };
    } else if (fmt === 'VP8X') {
      return {
        width:  buffer.readUIntLE(24, 3) + 1,
        height: buffer.readUIntLE(27, 3) + 1
      };
    }
  }

  if (buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1 && buffer.readUInt16LE(4) >= 1) {
    const entryOffset = 6;
    let width  = buffer.readUInt8(entryOffset + 0);
    let height = buffer.readUInt8(entryOffset + 1);
    if (width  === 0) width  = 256;
    if (height === 0) height = 256;
    return { width, height };
  }

  throw new Error('Unsupported or corrupted image format');
}

module.exports = getImageSize;