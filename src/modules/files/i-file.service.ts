import { Readable } from 'stream';

export interface IFileService {
	uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }>;

	downloadFile(filename: string): Promise<Readable>;
}
