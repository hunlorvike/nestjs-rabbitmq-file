// i-file-upload.service.ts
import { Express } from 'express';
import { Multer } from 'multer';

export interface IFileUploadService {
  uploadFile(file: Express.Multer.File): Promise<string>;
}
