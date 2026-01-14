import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationOptions, PaginatedResult } from '../types';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return document.save();
  }

  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    return this.model.findById(id, undefined, options);
  }

  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findOne(filter, undefined, options);
  }

  async find(filter: FilterQuery<T> = {}, options?: QueryOptions): Promise<T[]> {
  return this.model.find(filter, undefined, options).exec() as Promise<T[]>; // Add type assertion
}



async findWithPagination(
  filter: FilterQuery<T> = {},
  pagination: PaginationOptions,
  populateFields?: string | string[]
): Promise<PaginatedResult<T>> {
  const { page, limit, sort, order } = pagination;
  const skip = (page - 1) * limit;
  const sortOrder = order === 'asc' ? 1 : -1;

  let query = this.model.find(filter).skip(skip).limit(limit).sort({ [sort || '_id']: sortOrder });

  if (populateFields) {
    if (Array.isArray(populateFields)) {
      populateFields.forEach(field => {
        query = query.populate(field) as any;
      });
    } else {
      query = query.populate(populateFields) as any;
    }
  }

  const [data, total] = await Promise.all([
    query.exec() as Promise<T[]>,
    this.model.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

  async update(id: string, data: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {    
    return this.model.findByIdAndUpdate(id, data, { new: true, ...options });
  }

  async updateOne(filter: FilterQuery<T>, data: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, data, { new: true, ...options });
  }

  async updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<number> {
    const result = await this.model.updateMany(filter, data);
    return result.modifiedCount;
  }

  async delete(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id);
  }

  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
  return this.model.findOneAndDelete(filter).exec() as unknown as Promise<T | null>;
}

  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter);
    return result.deletedCount;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1);
    return count > 0;
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline);
  }

  async bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations);
  }
}