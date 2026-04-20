import { Type } from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';
import { buildMulterOptions } from './multer-options.factory';

export function SingleImageInterceptor(
  fieldName: string,
  dest = UPLOAD_CONSTANTS.IMAGE_DEST,
): Type<any> {
  return FileInterceptor(fieldName, buildMulterOptions('image', dest));
}

export function MultipleImagesInterceptor(
  fieldName: string,
  maxCount = UPLOAD_CONSTANTS.MAX_IMAGES_COUNT,
  dest = UPLOAD_CONSTANTS.IMAGE_DEST,
): Type<any> {
  return FilesInterceptor(
    fieldName,
    maxCount,
    buildMulterOptions('image', dest),
  );
}

export function PropertyFilesInterceptor(
  imageField = 'images',
  documentField = 'documents',
  imageDest = UPLOAD_CONSTANTS.IMAGE_DEST,
): Type<any> {
  return FileFieldsInterceptor(
    [
      { name: imageField, maxCount: UPLOAD_CONSTANTS.MAX_IMAGES_COUNT },
      { name: documentField, maxCount: UPLOAD_CONSTANTS.MAX_DOCUMENTS_COUNT },
    ],
    buildMulterOptions('any', imageDest),
  );
}
