/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job } from "../../src/types.js";
import { db } from "../database/db.js";

export class JobRepository {
  public async create(job: Job): Promise<Job> {
    db.jobs.push(job);
    await db.upsert("jobs", job.id, job);
    return job;
  }

  public async findById(id: string): Promise<Job | null> {
    const job = db.jobs.find(j => j.id === id);
    return job || null;
  }

  public async findAll(): Promise<Job[]> {
    return [...db.jobs];
  }

  public async update(id: string, updates: Partial<Job>): Promise<Job | null> {
    const index = db.jobs.findIndex(j => j.id === id);
    if (index === -1) return null;

    db.jobs[index] = {
      ...db.jobs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await db.upsert("jobs", id, db.jobs[index]);
    return db.jobs[index];
  }

  public async getByType(type: string): Promise<Job[]> {
    return db.jobs.filter(j => j.type === type);
  }
}
