import { PipeTransform, Injectable, BadRequestException, Optional } from '@nestjs/common';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

@Injectable()
export class ImageValidationPipe implements PipeTransform {
    constructor(@Optional() private readonly options = { required: true }) {}

    transform(file: Express.Multer.File) {
        if (!file) {
            if (this.options.required) throw new BadRequestException('Aucune image fournie.');
            return null;
        }
        if (!UPLOAD_CONSTANTS.ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
            throw new BadRequestException(`Type non autorisé: "${file.mimetype}"`);
        }
        if (file.size > UPLOAD_CONSTANTS.MAX_IMAGE_SIZE_BYTES) {
            throw new BadRequestException('Image trop lourde (max 5MB)');
        }
        return file;
    }
}