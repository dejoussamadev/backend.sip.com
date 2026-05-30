import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFurnishingDto } from './dto/create-furnishing.dto';
import { UpdateFurnishingDto } from './dto/update-furnishing.dto';
import { normalizePagination } from '../common/utils/pagination.util';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';

/** Include clause reused across findOne and findAll. */
const FURNISHING_INCLUDE = {
  categories: { include: { category: true } },
  _count: { select: { properties: true } },
};

/** Maps a raw Prisma furnishing record (with include) to the flattened API shape. */
const mapFurnishing = ({ _count, categories, ...furnishing }: any) => ({
  ...furnishing,
  propertiesCount: _count.properties,
  categories: categories.map((cf: any) => cf.category),
});

@Injectable()
export class FurnishingsService {
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

  // ─── In-use link guards ────────────────────────────────────────────────────

  /**
   * Throws a 409 when a property already uses this (furnishingId, categoryId)
   * combo, preventing the admin from removing the link unexpectedly.
   */
  private async guardCategoryUnlink(furnishingId: number, categoryId: number): Promise<void> {
    const count = await this.prisma.property.count({ where: { furnishingId, categoryId } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot unlink category: ${count} properties still use this furnishing with that category.`,
      );
    }
  }

  // ─── Link sync helper ──────────────────────────────────────────────────────

  /**
   * Adds new CategoryFurnishing rows and removes obsolete ones.
   * All removals must be pre-cleared with `guardCategoryUnlink` before calling.
   */
  private async applyCategoryLinks(
    furnishingId: number,
    newIds: number[],
    oldIds: number[],
  ): Promise<void> {
    const removed = oldIds.filter((id) => !newIds.includes(id));
    const added = newIds.filter((id) => !oldIds.includes(id));
    await Promise.all([
      removed.length
        ? this.prisma.categoryFurnishing.deleteMany({
            where: { furnishingId, categoryId: { in: removed } },
          })
        : Promise.resolve(),
      added.length
        ? this.prisma.categoryFurnishing.createMany({
            data: added.map((categoryId) => ({ categoryId, furnishingId })),
          })
        : Promise.resolve(),
    ]);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Creates a furnishing and writes all supplied category join rows in the
   * same operation.
   */
  async create(dto: CreateFurnishingDto) {
    await this.assertCategoriesExist(dto.categoryIds);

    const created = await this.prisma.furnishing.create({
      data: {
        name: dto.name,
        categories: {
          create: dto.categoryIds.map((categoryId) => ({ categoryId })),
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
      const data = await this.prisma.furnishing.findMany({
        where,
        include: FURNISHING_INCLUDE,
        orderBy: { name: 'asc' },
      });
      return data.map(mapFurnishing);
    }

    const pagination = normalizePagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.furnishing.findMany({
        where,
        include: FURNISHING_INCLUDE,
        orderBy: { id: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.furnishing.count({ where }),
    ]);

    return {
      data: data.map(mapFurnishing),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /** Returns the mapped furnishing or throws NotFoundException. */
  async findOne(id: number) {
    const furnishing = await this.prisma.furnishing.findUnique({
      where: { id },
      include: FURNISHING_INCLUDE,
    });
    if (!furnishing) throw new NotFoundException('Furnishing not found');
    return mapFurnishing(furnishing);
  }

  /**
   * Updates the furnishing's name and/or its category links.
   * Removals that would orphan existing properties are blocked with a 409.
   */
  async update(id: number, dto: UpdateFurnishingDto) {
    const current = await this.findOne(id);

    // Pre-flight: verify referenced IDs and guard all link removals
    if (dto.categoryIds !== undefined) {
      await this.assertCategoriesExist(dto.categoryIds);
      const removedCatIds = (current.categories as any[])
        .map((c) => c.id)
        .filter((cId) => !dto.categoryIds!.includes(cId));
      for (const categoryId of removedCatIds) {
        await this.guardCategoryUnlink(id, categoryId);
      }
    }

    // Apply changes
    if (dto.name !== undefined) {
      await this.prisma.furnishing.update({ where: { id }, data: { name: dto.name } });
    }
    if (dto.categoryIds !== undefined) {
      const oldCatIds = (current.categories as any[]).map((c) => c.id);
      await this.applyCategoryLinks(id, dto.categoryIds, oldCatIds);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({
      where: { furnishingId: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete furnishing: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.furnishing.delete({ where: { id } });
  }

  // ─── Navigation helpers ────────────────────────────────────────────────────

  /** Returns all properties that use this furnishing. */
  async findPropertiesByFurnishing(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { furnishingId: id },
      include: {
        category: true,
        type: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns all furnishings linked to the given category. */
  async findFurnishingsByCategoryId(id: number) {
    const catFurnishings = await this.prisma.categoryFurnishing.findMany({
      where: { categoryId: id },
      include: { furnishing: true },
    });
    return catFurnishings.map((cf) => cf.furnishing);
  }

  async countFurnishings() {
    return {
      total: await this.prisma.furnishing.count(),
    };
  }
}
