import { Request, Response } from 'express';
import { projectService } from '../services/project.service';

export class ProjectController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { status, country, page, limit } = req.query;
    const result = await projectService.findAll({
      status: status as string,
      country: country as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });
    res.json({ success: true, data: result.projects, pagination: { page: result.page, limit: parseInt(limit as string) || 20, total: result.total, pages: result.pages } });
  }

  async search(req: Request, res: Response): Promise<void> {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    const results = await projectService.search(q.trim());
    res.json({ success: true, data: results });
  }

  async findById(req: Request, res: Response): Promise<void> {
    const project = await projectService.findById(req.params.id);
    if (!project) { res.status(404).json({ success: false, message: 'Project not found' }); return; }
    res.json({ success: true, data: project });
  }

  async create(req: Request, res: Response): Promise<void> {
    const project = await projectService.create(req.body);
    res.status(201).json({ success: true, message: 'Project created', data: project });
  }

  async update(req: Request, res: Response): Promise<void> {
    const project = await projectService.update(req.params.id, req.body);
    if (!project) { res.status(404).json({ success: false, message: 'Project not found' }); return; }
    res.json({ success: true, message: 'Project updated', data: project });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const deleted = await projectService.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: 'Project not found' }); return; }
    res.json({ success: true, message: 'Project deleted' });
  }
}

export const projectController = new ProjectController();
