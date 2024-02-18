import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export function generateUniqueFileName(originalFilename: string): string {
    const timestamp = new Date().getTime();
    const uuid = uuidv4();
    const sanitizedOriginalFilename = originalFilename.replace(/[^a-zA-Z0-9_.]/g, "-");

    const maxLength = 50;
    const hash = crypto.createHash('sha256').update(sanitizedOriginalFilename).digest('hex');
    const truncatedHash = hash.substring(0, maxLength - 37); 

    let filename = `${timestamp}-${uuid}-${truncatedHash}`;
    const extension = getExtension(originalFilename);

    if (filename.length + extension.length + 1 > maxLength) {
        filename = filename.substring(0, maxLength - extension.length - 1);
    }

    return `${filename}.${extension}`;
}

function getExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1) : '';
}
