import { Milestone, MilestoneFilterOptions } from "../types";
import { effectiveStatus, milestoneProgress, readMilestones, removeMilestone, upsertMilestone } from "../lib/localLists";

/**
 * Milestones live in the account's browser lists, so the Milestones page, the
 * workspace, the dashboard and the assistant read and change the same items.
 * Status "Overdue" and progress are derived on read.
 */
function present(item: Milestone): Milestone {
  return { ...item, status: effectiveStatus(item), progress: milestoneProgress(item) };
}

function newId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

class MilestoneService {
  list(): Milestone[] {
    return readMilestones().map(present);
  }

  async getMilestones(options: MilestoneFilterOptions = {}): Promise<{ milestones: Milestone[], total: number }> {
    let filtered = this.list();

    if (options.status && options.status !== 'All') {
      if (options.status === 'Active') {
        filtered = filtered.filter(m => m.status === 'In Progress' || m.status === 'Planned');
      } else {
        filtered = filtered.filter(m => m.status === options.status);
      }
    }

    if (options.category) {
      filtered = filtered.filter(m => m.category === options.category);
    }

    if (options.priority) {
      filtered = filtered.filter(m => m.priority === options.priority);
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    const total = filtered.length;

    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit;
      filtered = filtered.slice(start, start + options.limit);
    }

    return { milestones: filtered, total };
  }

  async getMilestoneById(id: string): Promise<Milestone | undefined> {
    return this.list().find(m => m.id === id);
  }

  async createMilestone(milestone: Partial<Milestone>): Promise<Milestone> {
    const now = new Date().toISOString();
    const created: Milestone = {
      id: newId(),
      title: milestone.title?.trim() || "Untitled milestone",
      description: milestone.description || "",
      targetDate: milestone.targetDate || now.slice(0, 10),
      status: milestone.status || 'Planned',
      category: milestone.category || 'Product',
      priority: milestone.priority || 'Medium',
      progress: milestone.progress || 0,
      tasks: milestone.tasks || [],
      notes: milestone.notes,
      ownerId: milestone.ownerId || "me",
      createdAt: now,
      updatedAt: now
    };
    upsertMilestone(created);
    return present(created);
  }

  async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const existing = readMilestones().find(m => m.id === id);
    if (!existing) throw new Error("Milestone not found");
    const updated: Milestone = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    if (updates.status === 'Completed') updated.progress = 100;
    upsertMilestone(updated);
    return present(updated);
  }

  async deleteMilestone(id: string): Promise<void> {
    removeMilestone(id);
  }

  async getStrategicMilestones(): Promise<Milestone[]> {
    return this.list()
      .filter(m => m.status !== 'Completed' && (m.priority === 'High' || m.status === 'In Progress' || m.status === 'Overdue'))
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 3);
  }
}

export const milestoneService = new MilestoneService();
