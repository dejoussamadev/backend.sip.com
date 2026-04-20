import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

export type FileKind = 'image' | 'document' | 'any';

function buildStorage(dest: string) {
  return diskStorage({
    destination: dest,
    filename: (_req, file, cb) => {
      const unique = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
      cb(null, unique);
    },
  });
}

function buildFileFilter(kind: FileKind) {
  return (_req: any, file: Express.Multer.File, cb: any) => {
    const mime = file.mimetype;
    const isImage = UPLOAD_CONSTANTS.ALLOWED_IMAGE_MIMETYPES.includes(mime);
    const isDoc = UPLOAD_CONSTANTS.ALLOWED_DOCUMENT_MIMETYPES.includes(mime);

    if (kind === 'image' && !isImage) {
      return cb(new BadRequestException(`Type non autorisé: "${mime}"`), false);
    }
    if (kind === 'document' && !isDoc) {
      return cb(new BadRequestException(`Type non autorisé: "${mime}"`), false);
    }
    if (kind === 'any' && !isImage && !isDoc) {
      return cb(new BadRequestException(`Type non autorisé: "${mime}"`), false);
    }
    cb(null, true);
  };
}

export function buildMulterOptions(
  kind: FileKind,
  dest: string,
  maxSizeBytes?: number,
): MulterOptions {
  const defaultMax =
    kind === 'document'
      ? UPLOAD_CONSTANTS.MAX_DOCUMENT_SIZE_BYTES
      : UPLOAD_CONSTANTS.MAX_IMAGE_SIZE_BYTES;

  return {
    storage: buildStorage(dest),
    limits: { fileSize: maxSizeBytes ?? defaultMax },
    fileFilter: buildFileFilter(kind),
  };
}
