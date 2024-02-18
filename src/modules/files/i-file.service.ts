import { Readable } from 'stream';

export interface IFileService {
	uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }>;

	uploadBatchFiles(files: Express.Multer.File[]): Promise<{ filename: string, status: number, message: string }[]>;

	downloadFile(filename: string): Promise<Readable>;
}
