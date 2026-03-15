export const UPLOAD_CONSTANTS = {
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
    MAX_DOCUMENT_SIZE_BYTES: 20 * 1024 * 1024,
    ALLOWED_IMAGE_MIMETYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_DOCUMENT_MIMETYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    IMAGE_DEST: './uploads/images',
    DOCUMENT_DEST: './uploads/documents',
    MAX_IMAGES_COUNT: 20,
    MAX_DOCUMENTS_COUNT: 5,
};