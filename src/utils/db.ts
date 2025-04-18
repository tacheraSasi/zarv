import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

// Define interfaces for our data models
export interface User {
  id?: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id?: number;
  userId: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schema {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  endpointUrl?: string;
  schemaDefinition: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the database class
class SchemaManagerDatabase extends Dexie {
  users!: Table<User, number>;
  projects!: Table<Project, number>;
  schemas!: Table<Schema, number>;

  constructor() {
    super('SchemaManagerDatabase');
    this.version(1).stores({
      users: '++id, email',
      projects: '++id, userId, name',
      schemas: '++id, projectId, name'
    });
  }
}

// Create a database instance with error handling
export const db = new SchemaManagerDatabase();

// Add error event listeners to the database
db.on('ready', () => {
  console.log('Database is ready');
});

db.on('error', (error) => {
  console.error('Database error:', error);
});

// Ensure database is open before use
db.open().catch(error => {
  console.error('Failed to open database:', error);
});

// Add hooks for consistent error handling and Promise management
db.use({
  stack: 'dbcore',
  name: 'PromiseErrorHandler',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          mutate: async req => {
            try {
              return await downlevelTable.mutate(req);
            } catch (error) {
              console.error(`Error in table ${tableName} operation:`, error);
              throw error; // Rethrow to be handled by caller
            }
          },
          get: async primaryKey => {
            try {
              return await downlevelTable.get(primaryKey);
            } catch (error) {
              console.error(`Error getting record from ${tableName}:`, error);
              throw error; // Rethrow to be handled by caller
            }
          }
        };
      }
    };
  }
});

// Utility function for safe Promise handling
export const safePromise = async <T>(promise: Promise<T>): Promise<T> => {
  try {
    return await Promise.resolve(promise);
  } catch (error) {
    console.error('Promise error:', error);
    throw error;
  }
};

// Encryption utilities
const SECRET_KEY = 'schema-manager-secret-key'; // In a real app, this should be stored securely

export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// CRUD operations for User
export const userOperations = {
  async create(email: string, password: string): Promise<number> {
    try {
      // Convert email to lowercase for consistency
      const lowerEmail = email.toLowerCase();
      const passwordHash = CryptoJS.SHA256(password).toString();
      const now = new Date();
      // Use safePromise to ensure proper Promise handling
      const userId = await safePromise(db.users.add({
        email: lowerEmail,
        passwordHash,
        createdAt: now,
        updatedAt: now
      }));
      return userId;
    } catch (error) {
      console.error('Error in create user:', error);
      throw new Error(`Database error while creating user: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getByEmail(email: string): Promise<User | undefined> {
    try {
      // Convert email to lowercase for case-insensitive comparison
      const lowerEmail = email.toLowerCase();
      // Get all users and find the one with matching email (case-insensitive)
      // Use safePromise to ensure proper Promise handling
      const users = await safePromise(db.users.toArray());
      return users.find(user => user.email.toLowerCase() === lowerEmail);
    } catch (error) {
      console.error('Error in getByEmail:', error);
      throw new Error(`Database error while retrieving user by email: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async authenticate(email: string, password: string): Promise<User | null> {
    try {
      // Get user with case-insensitive email comparison
      let user;
      try {
        // Use safePromise to ensure proper Promise handling
        user = await safePromise(this.getByEmail(email));
      } catch (err) {
        console.error('Error getting user by email:', err);
        throw new Error('Database error while retrieving user');
      }

      if (!user) {
        console.log('User not found with email:', email);
        return null;
      }

      // Compare password hashes
      const passwordHash = CryptoJS.SHA256(password).toString();
      const isPasswordValid = user.passwordHash === passwordHash;

      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error; // Rethrow the error to be handled by the caller
    }
  }
};

// CRUD operations for Project
export const projectOperations = {
  async create(userId: number, name: string, description?: string): Promise<number> {
    const now = new Date();
    return await db.projects.add({
      userId,
      name,
      description,
      createdAt: now,
      updatedAt: now
    });
  },

  async getById(id: number): Promise<Project | undefined> {
    return await db.projects.get(id);
  },

  async getByUserId(userId: number): Promise<Project[]> {
    return await db.projects.where('userId').equals(userId).toArray();
  },

  async update(id: number, data: Partial<Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await db.projects.update(id, { ...data, updatedAt: new Date() });
  },

  async delete(id: number): Promise<void> {
    // First delete all schemas associated with this project
    await db.schemas.where('projectId').equals(id).delete();
    // Then delete the project
    await db.projects.delete(id);
  }
};

// CRUD operations for Schema
export const schemaOperations = {
  async create(
    projectId: number,
    name: string,
    schemaDefinition: string,
    description?: string,
    endpointUrl?: string
  ): Promise<number> {
    const now = new Date();
    return await db.schemas.add({
      projectId,
      name,
      description,
      endpointUrl,
      schemaDefinition: encryptData(schemaDefinition), // Encrypt schema definition
      createdAt: now,
      updatedAt: now
    });
  },

  async getById(id: number): Promise<Schema | undefined> {
    const schema = await db.schemas.get(id);
    if (schema) {
      // Decrypt schema definition
      schema.schemaDefinition = decryptData(schema.schemaDefinition);
    }
    return schema;
  },

  async getByProjectId(projectId: number): Promise<Schema[]> {
    const schemas = await db.schemas.where('projectId').equals(projectId).toArray();
    // Decrypt schema definitions
    return schemas.map(schema => ({
      ...schema,
      schemaDefinition: decryptData(schema.schemaDefinition)
    }));
  },

  async update(
    id: number,
    data: Partial<Omit<Schema, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const updateData = { ...data, updatedAt: new Date() };

    // Encrypt schema definition if it's being updated
    if (updateData.schemaDefinition) {
      updateData.schemaDefinition = encryptData(updateData.schemaDefinition);
    }

    await db.schemas.update(id, updateData);
  },

  async delete(id: number): Promise<void> {
    await db.schemas.delete(id);
  }
};

export default db;
