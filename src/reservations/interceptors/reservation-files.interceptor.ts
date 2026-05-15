import { BadRequestException, Type } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions } from '../../upload/interceptors/multer-options.factory';
import { UPLOAD_CONSTANTS } from '../../upload/constants/upload.constants';

/**
 * Per-field MIME type rules:
 * - Signature fields only accept images.
 * - `paymentProof` accepts images and documents (PDF, Word, etc.).
 *
 * `FileFieldsInterceptor` applies one global filter, so we implement
 * the per-field logic inside a single custom filter.
 */
function reservationFilesFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
): void {
  const mime = file.mimetype;
  const isImage = UPLOAD_CONSTANTS.ALLOWED_IMAGE_MIMETYPES.includes(mime);
  const isDoc = UPLOAD_CONSTANTS.ALLOWED_DOCUMENT_MIMETYPES.includes(mime);

  const isSignature =
    file.fieldname === 'clientSignature' ||
    file.fieldname === 'consultantSignature';

  if (isSignature && !isImage) {
    return cb(
      new BadRequestException(
        `Signature files must be images. Received: "${mime}"`,
      ),
      false,
    );
  }

  if (!isImage && !isDoc) {
    return cb(
      new BadRequestException(`File type not allowed: "${mime}"`),
      false,
    );
  }

  cb(null, true);
}

export function ReservationFilesInterceptor(): Type<any> {
  return FileFieldsInterceptor(
    [
      { name: 'clientSignature', maxCount: 1 },
      { name: 'consultantSignature', maxCount: 1 },
      { name: 'paymentProof', maxCount: 1 },
    ],
    {
      ...buildMulterOptions('any', UPLOAD_CONSTANTS.IMAGE_DEST),
      fileFilter: reservationFilesFilter,
    },
  );
}

export function ConsultantSignatureInterceptor(): Type<any> {
  return FileFieldsInterceptor(
    [{ name: 'consultantSignature', maxCount: 1 }],
    buildMulterOptions('image', UPLOAD_CONSTANTS.IMAGE_DEST),
  );
}
