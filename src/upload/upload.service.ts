import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFileInfo {
    originalName: string;
    filename: string;
    mimetype: string;
    sizeBytes: number;
    url: string;
    path: string;
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    toFileInfo(file: Express.Multer.File, baseUrl: string): UploadedFileInfo {
        return {
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            sizeBytes: file.size,
            url: `${baseUrl}/${file.path.replace(/\\/g, '/')}`,
            path: file.path,
        };
    }

    toFilesInfo(files: Express.Multer.File[], baseUrl: string): UploadedFileInfo[] {
        return (files ?? []).map((f) => this.toFileInfo(f, baseUrl));
    }

    getUrl(file: Express.Multer.File, baseUrl: string): string {
        return `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
    }

    getUrls(files: Express.Multer.File[], baseUrl: string): string[] {
        return (files ?? []).map((f) => this.getUrl(f, baseUrl));
    }

    deleteFile(filePath: string): void {
        const uploadsRoot = path.resolve('uploads');
        const fullPath = path.resolve(filePath);
        if (!fullPath.startsWith(uploadsRoot + path.sep)) {
            throw new NotFoundException(`Invalid file path: ${filePath}`);
        }
        if (!fs.existsSync(fullPath)) throw new NotFoundException(`Fichier introuvable: ${filePath}`);
        fs.unlinkSync(fullPath);
        this.logger.log(`Fichier supprimé: ${fullPath}`);
    }

    rollback(files: Express.Multer.File[]): void {
        (files ?? []).forEach((f) => {
            try { this.deleteFile(f.path); }
            catch (e) { this.logger.warn(`Rollback échoué: ${f.path}`); }
        });
    }
}