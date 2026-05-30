import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { normalizePagination } from '../common/utils/pagination.util';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';

/** Include clause reused across findOne and findAll. */
const CATEGORY_INCLUDE = {
  types: { include: { type: true } },
  furnishings: { include: { furnishing: true } },
  _count: { select: { properties: true } },
};

/** Maps a raw Prisma category record (with include) to the flattened API shape. */
const mapCategory = ({ _count, types, furnishings, ...category }: any) => ({
  ...category,
  propertiesCount: _count.properties,
  types: types.map((ct: any) => ct.type),
  furnishings: furnishings.map((cf: any) => cf.furnishing),
});

@Injectable()
export class CategoriesService {
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

  /** Throws a 400 if any of the provided furnishing IDs do not exist. */
  private async assertFurnishingsExist(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.furnishing.count({
      where: { id: { in: ids } },
    });
    if (found !== ids.length) {
      throw AppValidationException.from(this.catalog, [
        { field: 'furnishingIds', code: 'SETTINGS_FURNISHING_NOT_FOUND' },
      ]);
    }
  }

  // ─── In-use link guards ────────────────────────────────────────────────────

  /**
   * Throws a 409 when a property already uses this (categoryId, typeId) combo,
   * preventing the admin from removing the link unexpectedly.
   */
  private async guardTypeUnlink(
    categoryId: number,
    typeId: number,
  ): Promise<void> {
    const count = await this.prisma.property.count({
      where: { categoryId, typeId },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink type: ${count} properties still use this category with that type.`,
      );
    }
  }

  /**
   * Throws a 409 when a property already uses this (categoryId, furnishingId)
   * combo, preventing the admin from removing the link unexpectedly.
   */
  private async guardFurnishingUnlink(
    categoryId: number,
    furnishingId: number,
  ): Promise<void> {
    const count = await this.prisma.property.count({
      where: { categoryId, furnishingId },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink furnishing: ${count} properties still use this category with that furnishing.`,
      );
    }
  }

  // ─── Link sync helpers ─────────────────────────────────────────────────────

  /**
   * Adds new CategoryType rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardTypeUnlink` before calling.
   */
  private async applyTypeLinks(
    categoryId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.categoryType.deleteMany({
            where: { categoryId, typeId: { in: removed } },
          })
        : Promise.resolve(),
      added.length
        ? this.prisma.categoryType.createMany({
            data: added.map((typeId) => ({ categoryId, typeId })),
          })
        : Promise.resolve(),
    ]);
  }

  /**
   * Adds new CategoryFurnishing rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardFurnishingUnlink` before calling.
   */
  private async applyFurnishingLinks(
    categoryId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.categoryFurnishing.deleteMany({
            where: { categoryId, furnishingId: { in: removed } },
          })
        : Promise.resolve(),
      added.length
        ? this.prisma.categoryFurnishing.createMany({
            data: added.map((furnishingId) => ({ categoryId, furnishingId })),
          })
        : Promise.resolve(),
    ]);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Creates a category and writes all supplied type / furnishing join rows
   * in the same operation. Both typeIds and furnishingIds are required.
   */
  async create(dto: CreateCategoryDto) {
    await this.assertTypesExist(dto.typeIds);
    await this.assertFurnishingsExist(dto.furnishingIds);

    const created = await this.prisma.category.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        types: { create: dto.typeIds.map((typeId) => ({ typeId })) },
        furnishings: {
          create: dto.furnishingIds.map((furnishingId) => ({ furnishingId })),
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
      const data = await this.prisma.category.findMany({
        where,
        include: CATEGORY_INCLUDE,
        orderBy: { name: 'asc' },
      });
      return data.map(mapCategory);
    }

    const pagination = normalizePagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: CATEGORY_INCLUDE,
        orderBy: { id: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: data.map(mapCategory),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /** Returns the mapped category or throws NotFoundException. */
  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
    if (!category) throw new NotFoundException('Category not found');
    return mapCategory(category);
  }

  /**
   * Updates the category's name and/or its type / furnishing links.
   * `kind` is intentionally omitted from UpdateCategoryDto and cannot
   * be changed after creation.
   * Removals that would orphan existing properties are blocked with a 409.
   */
  async update(id: number, dto: UpdateCategoryDto) {
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
    if (dto.furnishingIds !== undefined) {
      await this.assertFurnishingsExist(dto.furnishingIds);
      const removedFurnishingIds = (current.furnishings as any[])
        .map((f) => f.id)
        .filter((fId) => !dto.furnishingIds!.includes(fId));
      for (const furnishingId of removedFurnishingIds) {
        await this.guardFurnishingUnlink(id, furnishingId);
      }
    }

    // Apply changes
    if (dto.name !== undefined) {
      await this.prisma.category.update({
        where: { id },
        data: { name: dto.name },
      });
    }
    if (dto.typeIds !== undefined) {
      const oldTypeIds = (current.types as any[]).map((t) => t.id);
      await this.applyTypeLinks(id, dto.typeIds, oldTypeIds);
    }
    if (dto.furnishingIds !== undefined) {
      const oldFurnishingIds = (current.furnishings as any[]).map((f) => f.id);
      await this.applyFurnishingLinks(id, dto.furnishingIds, oldFurnishingIds);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete category: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }

  // ─── Navigation helpers ────────────────────────────────────────────────────

  /** Returns all properties that use this category. */
  async findPropertiesByCategory(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { categoryId: id },
      include: {
        type: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns all types linked to this category. */
  async findTypesByCategory(id: number) {
    await this.findOne(id);
    const categoryTypes = await this.prisma.categoryType.findMany({
      where: { categoryId: id },
      include: { type: true },
    });
    return categoryTypes.map((ct) => ct.type);
  }

  /** Returns all furnishings linked to this category. */
  async findFurnishingsByCategory(id: number) {
    await this.findOne(id);
    const categoryFurnishings = await this.prisma.categoryFurnishing.findMany({
      where: { categoryId: id },
      include: { furnishing: true },
    });
    return categoryFurnishings.map((cf) => cf.furnishing);
  }

  async countCategories() {
    return {
      total: await this.prisma.category.count(),
    };
  }
}
