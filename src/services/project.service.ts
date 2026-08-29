import { Project, ProjectDocument } from '../models/project.model';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

export class ProjectService {
  async findAll(query: { status?: string; country?: string; page?: number; limit?: number }): Promise<{
    projects: ProjectDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, string> = {};
    if (query.status) filter.status = query.status;
    if (query.country) filter.country = query.country;

    const cacheKey = `projects:${JSON.stringify(filter)}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [projects, total] = await Promise.all([
      Project.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Project.countDocuments(filter),
    ]);

    const result = { projects, total, page, pages: Math.ceil(total / limit) };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    return result;
  }

  async search(query: string): Promise<ProjectDocument[]> {
    const searchRegex = new RegExp(query, 'i');
    return Project.find({
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { country: searchRegex },
        { sector: searchRegex },
        { manager: searchRegex },
      ],
    }).limit(10).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<ProjectDocument | null> {
    return Project.findById(id);
  }

  async create(data: Partial<ProjectDocument>): Promise<ProjectDocument> {
    const project = await Project.create(data);
    logger.info(`Project created: ${project.code}`);
    return project;
  }

  async update(id: string, data: Partial<ProjectDocument>): Promise<ProjectDocument | null> {
    const project = await Project.findByIdAndUpdate(id, data, { new: true });
    if (project) {
      await redis.del(`projects:*`);
      logger.info(`Project updated: ${project.code}`);
    }
    return project;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Project.findByIdAndDelete(id);
    if (result) await redis.del(`projects:*`);
    return !!result;
  }
}

export const projectService = new ProjectService();
