import { Controller, Get } from '@nestjs/common';
import { ErrorCatalogService } from './error-catalog.service';

/** Public endpoint that exposes the error-code catalog to the frontend. */
@Controller('errors')
export class ErrorsController {
  constructor(private readonly catalog: ErrorCatalogService) {}

  @Get('catalog')
  getCatalog(): Record<string, string> {
    return this.catalog.getAll();
  }
}
