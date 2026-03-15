import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UPLOAD_CONSTANTS } from './constants/upload.constants';

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),
        MulterModule.register({ dest: UPLOAD_CONSTANTS.IMAGE_DEST }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService, MulterModule],
})
export class UploadModule {}