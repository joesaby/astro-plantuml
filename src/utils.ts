// PlantUML uses a modified base64 encoding
const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

/**
 * Encodes a buffer using PlantUML's modified base64 encoding
 */
export function encode64(data: Buffer): string {
  let result = '';
  let currentByte = 0;
  let bitsLeft = 0;
  
  for (let i = 0; i < data.length; i++) {
    currentByte = (currentByte << 8) | data[i];
    bitsLeft += 8;
    
    while (bitsLeft >= 6) {
      bitsLeft -= 6;
      const index = (currentByte >> bitsLeft) & 0x3F;
      result += PLANTUML_ALPHABET[index];
    }
  }
  
  // Handle remaining bits
  if (bitsLeft > 0) {
    currentByte = (currentByte << (6 - bitsLeft)) & 0x3F;
    result += PLANTUML_ALPHABET[currentByte];
  }
  
  return result;
}