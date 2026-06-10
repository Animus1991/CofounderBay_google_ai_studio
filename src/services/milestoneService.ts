import { Milestone, MilestoneFilterOptions } from "../types";

// Mock data for initial milestones
const mockMilestones: Milestone[] = [
  {
    id: "1",
    title: "MVP Launch",
    description: "Release the first version of the platform to beta testers.",
    targetDate: "2026-04-15",
    status: 'In Progress',
    category: 'Product',
    priority: 'High',
    progress: 65,
    ownerId: "1",
    tasks: [
      { id: "1-1", title: "User Authentication", completed: true },
      { id: "1-2", title: "Profile System", completed: true },
      { id: "1-3", title: "Matching Algorithm", completed: false }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    title: "Legal Incorporation",
    description: "Complete all legal paperwork and register the company.",
    targetDate: "2026-03-10",
    status: 'Completed',
    category: 'Legal',
    priority: 'Medium',
    progress: 100,
    ownerId: "1",
    tasks: [
      { id: "2-1", title: "Articles of Association", completed: true },
      { id: "2-2", title: "Tax Registration", completed: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "3",
    title: "Seed Round Preparation",
    description: "Finalize pitch deck and financial projections for investors.",
    targetDate: "2026-05-20",
    status: 'Planned',
    category: 'Funding',
    priority: 'High',
    progress: 20,
    ownerId: "1",
    tasks: [
      { id: "3-1", title: "Pitch Deck Finalization", completed: true },
      { id: "3-2", title: "Investor Outreach", completed: false }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "4",
    title: "First 100 Users",
    description: "Reach the milestone of 100 active users on the platform.",
    targetDate: "2026-04-01",
    status: 'Overdue',
    category: 'Marketing',
    priority: 'High',
    progress: 85,
    ownerId: "1",
    tasks: [
      { id: "4-1", title: "Referral Program Launch", completed: true },
      { id: "4-2", title: "Content Marketing Strategy", completed: false }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "5",
    title: "Global Compliance Audit",
    description: "Ensure the platform meets international data protection standards.",
    targetDate: "2026-04-20",
    status: 'In Progress',
    category: 'Legal',
    priority: 'High',
    progress: 45,
    ownerId: "1",
    tasks: [
      { id: "5-1", title: "GDPR Compliance Check", completed: true },
      { id: "5-2", title: "SOC 2 Audit Preparation", completed: false }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class MilestoneService {
  private milestones: Milestone[] = [...mockMilestones];

  async getMilestones(options: MilestoneFilterOptions = {}): Promise<{ milestones: Milestone[], total: number }> {
    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...this.milestones];

        // Filtering
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

        // Sorting (newest first)
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = filtered.length;

        // Pagination
        if (options.page && options.limit) {
          const start = (options.page - 1) * options.limit;
          filtered = filtered.slice(start, start + options.limit);
        }

        resolve({ milestones: filtered, total });
      }, 500);
    });
  }

  async getMilestoneById(id: string): Promise<Milestone | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.milestones.find(m => m.id === id)), 300);
    });
  }

  async createMilestone(milestone: Partial<Milestone>): Promise<Milestone> {
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substr(2, 9),
      title: milestone.title || "Untitled Milestone",
      description: milestone.description || "",
      targetDate: milestone.targetDate || new Date().toISOString(),
      status: milestone.status || 'Planned',
      category: milestone.category || 'Product',
      priority: milestone.priority || 'Medium',
      progress: milestone.progress || 0,
      tasks: milestone.tasks || [],
      ownerId: milestone.ownerId || "1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.milestones.push(newMilestone);
    return new Promise((resolve) => {
      setTimeout(() => resolve(newMilestone), 500);
    });
  }

  async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const index = this.milestones.findIndex(m => m.id === id);
    const existing = this.milestones[index];
    if (index === -1 || !existing) throw new Error("Milestone not found");
    
    const updated: Milestone = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.milestones[index] = updated;
    
    return new Promise((resolve) => {
      setTimeout(() => resolve(updated), 500);
    });
  }

  async deleteMilestone(id: string): Promise<void> {
    this.milestones = this.milestones.filter(m => m.id !== id);
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  }

  async getStrategicMilestones(): Promise<Milestone[]> {
    // Return high priority or upcoming milestones for admin dashboard
    return new Promise((resolve) => {
      setTimeout(() => {
        const strategic = this.milestones
          .filter(m => m.priority === 'High' || m.status === 'In Progress')
          .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
          .slice(0, 3);
        resolve(strategic);
      }, 400);
    });
  }
}

export const milestoneService = new MilestoneService();
