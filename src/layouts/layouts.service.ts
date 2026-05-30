import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { normalizePagination } from '../common/utils/pagination.util';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';

/** Include clause reused across findOne and findAll. */
const LAYOUT_INCLUDE = {
  types: { include: { type: true } },
  _count: { select: { properties: true, types: true } },
};

/** Maps a raw Prisma layout record (with include) to the flattened API shape. */
const mapLayout = ({ _count, types, ...layout }: any) => ({
  ...layout,
  propertiesCount: _count.properties,
  typesCount: _count.types,
  types: types.map((tl: any) => tl.type),
});

@Injectable()
export class LayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ErrorCatalogService,
  ) {}

  // ─── Existence guards ──────────────────────────────────────────────────────

  /** Throws a 400 if any of the provided type IDs do not exist. */
  private async assertTypesExist(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.type.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw AppValidationException.from(this.catalog, [
        { field: 'typeIds', code: 'SETTINGS_TYPE_NOT_FOUND' },
      ]);
    }
  }

  // ─── In-use link guards ────────────────────────────────────────────────────

  /**
   * Throws a 409 when a property already uses this (layoutId, typeId) combo,
   * preventing the admin from removing the link unexpectedly.
   */
  private async guardTypeUnlink(layoutId: number, typeId: number): Promise<void> {
    const count = await this.prisma.property.count({ where: { layoutId, typeId } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink type: ${count} properties still use this layout with that type.`,
      );
    }
  }

  // ─── Link sync helper ──────────────────────────────────────────────────────

  /**
   * Adds new TypeLayout rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardTypeUnlink` before calling.
   */
  private async applyTypeLinks(
    layoutId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.typeLayout.deleteMany({ where: { layoutId, typeId: { in: removed } } })
        : Promise.resolve(),
      added.length
        ? this.prisma.typeLayout.createMany({
            data: added.map((typeId) => ({ typeId, layoutId })),
          })
        : Promise.resolve(),
    ]);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Creates a layout and writes all supplied type join rows in the same
   * operation.
   */
  async create(dto: CreateLayoutDto) {
    await this.assertTypesExist(dto.typeIds);

    const created = await this.prisma.layout.create({
      data: {
        name: dto.name,
        types: {
          create: dto.typeIds.map((typeId) => ({ typeId })),
        },
      },
    });
    return this.findOne(created.id);
  }

  async findAll(options: {
    paginate: boolean;
    page: unknown;
    limit: unknown;
    search?: string;
  }) {
    const { paginate, page, limit, search } = options;
    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    if (!paginate) {
      const data = await this.prisma.layout.findMany({
        where,
        orderBy: { id: 'asc' },
        include: LAYOUT_INCLUDE,
      });
      return data.map(mapLayout);
    }

    const pagination = normalizePagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.layout.findMany({
        where,
        orderBy: { id: 'desc' },
        include: LAYOUT_INCLUDE,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.layout.count({ where }),
    ]);

    return {
      data: data.map(mapLayout),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /** Returns the mapped layout or throws NotFoundException. */
  async findOne(id: number) {
    const layout = await this.prisma.layout.findUnique({
      where: { id },
      include: LAYOUT_INCLUDE,
    });
    if (!layout) throw new NotFoundException('Layout not found');
    return mapLayout(layout);
  }

  /**
   * Updates the layout's name and/or its type links.
   * Removals that would orphan existing properties are blocked with a 409.
   */
  async update(id: number, dto: UpdateLayoutDto) {
    const current = await this.findOne(id);

    // Pre-flight: verify referenced IDs and guard all link removals
    if (dto.typeIds !== undefined) {
      await this.assertTypesExist(dto.typeIds);
      const removedTypeIds = (current.types as any[])
        .map((t) => t.id)
        .filter((tId) => !dto.typeIds!.includes(tId));
      for (const typeId of removedTypeIds) {
        await this.guardTypeUnlink(id, typeId);
      }
    }

    // Apply changes
    if (dto.name !== undefined) {
      await this.prisma.layout.update({ where: { id }, data: { name: dto.name } });
    }
    if (dto.typeIds !== undefined) {
      const oldTypeIds = (current.types as any[]).map((t) => t.id);
      await this.applyTypeLinks(id, dto.typeIds, oldTypeIds);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({ where: { layoutId: id } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete layout: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.layout.delete({ where: { id } });
  }

  // ─── Navigation helpers ────────────────────────────────────────────────────

  /** Returns all properties that use this layout. */
  async findPropertiesByLayout(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { layoutId: id },
      include: {
        category: true,
        type: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns all layouts linked to the given type. */
  async findLayoutsByType(id: number) {
    const typeLayouts = await this.prisma.typeLayout.findMany({
      where: { typeId: id },
      include: { layout: true },
    });
    return typeLayouts.map((tl) => tl.layout);
  }

  async countLayouts() {
    return {
      total: await this.prisma.layout.count(),
    };
  }
}
