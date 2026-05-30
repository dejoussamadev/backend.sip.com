import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { normalizePagination } from '../common/utils/pagination.util';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';

/** Include clause reused across findOne and findAll. */
const TYPE_INCLUDE = {
  categories: { include: { category: true } },
  layouts: { include: { layout: true } },
  _count: { select: { properties: true } },
};

/** Maps a raw Prisma type record (with include) to the flattened API shape. */
const mapType = ({ _count, categories, layouts, ...type }: any) => ({
  ...type,
  propertiesCount: _count.properties,
  categories: categories.map((ct: any) => ct.category),
  layouts: layouts.map((tl: any) => tl.layout),
});

@Injectable()
export class TypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ErrorCatalogService,
  ) {}

  // ─── Existence guards ──────────────────────────────────────────────────────

  /** Throws a 400 if any of the provided category IDs do not exist. */
  private async assertCategoriesExist(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.category.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw AppValidationException.from(this.catalog, [
        { field: 'categoryIds', code: 'SETTINGS_CATEGORY_NOT_FOUND' },
      ]);
    }
  }

  /** Throws a 400 if any of the provided layout IDs do not exist. */
  private async assertLayoutsExist(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.layout.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw AppValidationException.from(this.catalog, [
        { field: 'layoutIds', code: 'SETTINGS_LAYOUT_NOT_FOUND' },
      ]);
    }
  }

  // ─── In-use link guards ────────────────────────────────────────────────────

  /**
   * Throws a 409 when a property already uses this (typeId, categoryId) combo,
   * preventing the admin from removing the link unexpectedly.
   */
  private async guardCategoryUnlink(typeId: number, categoryId: number): Promise<void> {
    const count = await this.prisma.property.count({ where: { typeId, categoryId } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink category: ${count} properties still use this type with that category.`,
      );
    }
  }

  /**
   * Throws a 409 when a property already uses this (typeId, layoutId) combo,
   * preventing the admin from removing the link unexpectedly.
   */
  private async guardLayoutUnlink(typeId: number, layoutId: number): Promise<void> {
    const count = await this.prisma.property.count({ where: { typeId, layoutId } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink layout: ${count} properties still use this type with that layout.`,
      );
    }
  }

  // ─── Link sync helpers ─────────────────────────────────────────────────────

  /**
   * Adds new CategoryType rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardCategoryUnlink` before calling.
   */
  private async applyCategoryLinks(
    typeId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.categoryType.deleteMany({ where: { typeId, categoryId: { in: removed } } })
        : Promise.resolve(),
      added.length
        ? this.prisma.categoryType.createMany({
            data: added.map((categoryId) => ({ categoryId, typeId })),
          })
        : Promise.resolve(),
    ]);
  }

  /**
   * Adds new TypeLayout rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardLayoutUnlink` before calling.
   */
  private async applyLayoutLinks(
    typeId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.typeLayout.deleteMany({ where: { typeId, layoutId: { in: removed } } })
        : Promise.resolve(),
      added.length
        ? this.prisma.typeLayout.createMany({
            data: added.map((layoutId) => ({ typeId, layoutId })),
          })
        : Promise.resolve(),
    ]);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Creates a type and writes all supplied category / layout join rows
   * in the same operation.
   */
  async create(dto: CreateTypeDto) {
    await this.assertCategoriesExist(dto.categoryIds);
    if (dto.layoutIds?.length) await this.assertLayoutsExist(dto.layoutIds);

    const created = await this.prisma.type.create({
      data: {
        name: dto.name,
        categories: {
          create: dto.categoryIds.map((categoryId) => ({ categoryId })),
        },
        ...(dto.layoutIds?.length
          ? { layouts: { create: dto.layoutIds.map((layoutId) => ({ layoutId })) } }
          : {}),
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
      const data = await this.prisma.type.findMany({
        where,
        include: TYPE_INCLUDE,
        orderBy: { name: 'asc' },
      });
      return data.map(mapType);
    }

    const pagination = normalizePagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.type.findMany({
        where,
        include: TYPE_INCLUDE,
        orderBy: { id: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.type.count({ where }),
    ]);

    return {
      data: data.map(mapType),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /** Returns the mapped type or throws NotFoundException. */
  async findOne(id: number) {
    const type = await this.prisma.type.findUnique({
      where: { id },
      include: TYPE_INCLUDE,
    });
    if (!type) throw new NotFoundException('Type not found');
    return mapType(type);
  }

  /**
   * Updates the type's name and/or its category / layout links.
   * Removals that would orphan existing properties are blocked with a 409.
   */
  async update(id: number, dto: UpdateTypeDto) {
    const current = await this.findOne(id);

    // Pre-flight: verify referenced IDs and guard all link removals before
    // making any changes (so we don't leave things half-applied on failure).
    if (dto.categoryIds !== undefined) {
      await this.assertCategoriesExist(dto.categoryIds);
      const removedCatIds = (current.categories as any[])
        .map((c) => c.id)
        .filter((cId) => !dto.categoryIds!.includes(cId));
      for (const categoryId of removedCatIds) {
        await this.guardCategoryUnlink(id, categoryId);
      }
    }
    if (dto.layoutIds !== undefined) {
      await this.assertLayoutsExist(dto.layoutIds);
      const removedLayoutIds = (current.layouts as any[])
        .map((l) => l.id)
        .filter((lId) => !dto.layoutIds!.includes(lId));
      for (const layoutId of removedLayoutIds) {
        await this.guardLayoutUnlink(id, layoutId);
      }
    }

    // Apply changes
    if (dto.name !== undefined) {
      await this.prisma.type.update({ where: { id }, data: { name: dto.name } });
    }
    if (dto.categoryIds !== undefined) {
      const oldCatIds = (current.categories as any[]).map((c) => c.id);
      await this.applyCategoryLinks(id, dto.categoryIds, oldCatIds);
    }
    if (dto.layoutIds !== undefined) {
      const oldLayoutIds = (current.layouts as any[]).map((l) => l.id);
      await this.applyLayoutLinks(id, dto.layoutIds, oldLayoutIds);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({ where: { typeId: id } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete type: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.type.delete({ where: { id } });
  }

  // ─── Navigation helpers ────────────────────────────────────────────────────

  /** Returns all properties that use this type. */
  async findPropertiesByType(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { typeId: id },
      include: {
        category: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns all layouts linked to this type. */
  async findLayoutsByType(id: number) {
    await this.findOne(id);
    const typeLayouts = await this.prisma.typeLayout.findMany({
      where: { typeId: id },
      include: { layout: true },
    });
    return typeLayouts.map((tl) => tl.layout);
  }

  /** Returns all types linked to the given category. */
  async findTypesByCategory(id: number) {
    const categoryTypes = await this.prisma.categoryType.findMany({
      where: { categoryId: id },
      include: { type: true },
    });
    return categoryTypes.map((ct) => ct.type);
  }

  async countTypes() {
    return {
      total: await this.prisma.type.count(),
    };
  }
}
