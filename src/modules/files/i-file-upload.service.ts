// i-file-upload.service.ts

export interface IFileUploadService {
	uploadFile(file: Express.Multer.File): Promise<{ message: string, status: number, filename: string }>;
}
