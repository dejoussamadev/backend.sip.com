import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { UploadService } from './upload.service';
import { SingleImageInterceptor, MultipleImagesInterceptor, PropertyFilesInterceptor } from './interceptors/file-upload.interceptor';
import { ImageValidationPipe } from './pipes/image-validation.pipe';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post('image')
    @UseInterceptors(SingleImageInterceptor('image'))
    @HttpCode(HttpStatus.CREATED)
    uploadSingleImage(
        @UploadedFile(new ImageValidationPipe()) file: Express.Multer.File,
        @Req() req: Request,
    ) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return { success: true, message: 'Image uploadée avec succès', data: this.uploadService.toFileInfo(file, baseUrl) };
    }

    @Post('images')
    @UseInterceptors(MultipleImagesInterceptor('images'))
    @HttpCode(HttpStatus.CREATED)
    uploadMultipleImages(@UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
        if (!files?.length) return { success: false, message: 'Aucune image reçue', data: [] };
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return { success: true, message: `${files.length} image(s) uploadée(s)`, data: this.uploadService.toFilesInfo(files, baseUrl) };
    }

    @Post('fields')
    @UseInterceptors(PropertyFilesInterceptor('images', 'documents'))
    @HttpCode(HttpStatus.CREATED)
    uploadPropertyFiles(
        @UploadedFiles() files: { images?: Express.Multer.File[]; documents?: Express.Multer.File[] },
        @Req() req: Request,
    ) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageInfos = this.uploadService.toFilesInfo(files.images ?? [], baseUrl);
        const documentInfos = this.uploadService.toFilesInfo(files.documents ?? [], baseUrl);
        return {
            success: true,
            message: `${imageInfos.length} image(s) et ${documentInfos.length} document(s) uploadé(s)`,
            data: {
                images: imageInfos,
                documents: documentInfos,
                imageUrls: imageInfos.map((i) => i.url),
                documentUrls: documentInfos.map((d) => d.url),
            },
        };
    }
}