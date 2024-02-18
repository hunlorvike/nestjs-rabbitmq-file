import { v4 as uuidv4 } from 'uuid';

export function generateUniqueFileName(originalFilename: string): string {
    const timestamp = new Date().getTime();
    const uuid = uuidv4();
    const sanitizedOriginalFilename = originalFilename.replace(/[^a-zA-Z0-9_.]/g, "-");

    return `${timestamp}-${uuid}-${sanitizedOriginalFilename}`;
}
