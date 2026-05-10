import { Type } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions } from '../../upload/interceptors/multer-options.factory';
import { UPLOAD_CONSTANTS } from '../../upload/constants/upload.constants';

export function ReservationFilesInterceptor(): Type<any> {
  return FileFieldsInterceptor(
    [
      { name: 'clientSignature', maxCount: 1 },
      { name: 'consultantSignature', maxCount: 1 },
      { name: 'paymentProof', maxCount: 1 },
    ],
    buildMulterOptions('any', UPLOAD_CONSTANTS.IMAGE_DEST),
  );
}

export function ConsultantSignatureInterceptor(): Type<any> {
  return FileFieldsInterceptor(
    [{ name: 'consultantSignature', maxCount: 1 }],
    buildMulterOptions('image', UPLOAD_CONSTANTS.IMAGE_DEST),
  );
}
