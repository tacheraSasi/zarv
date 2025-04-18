import CryptoJS from 'crypto-js';

// Define interfaces for our data models
export interface User {
  id?: number;
  email: string;
  name: string;
  position: 'frontend' | 'backend';
  numberOfProjects: number;
  isAdmin: boolean;
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

// Database name and version
const DB_NAME = 'SchemaManagerDatabase';
const DB_VERSION = 2;

// Store names
const STORES = {
  USERS: 'users',
  PROJECTS: 'projects',
  SCHEMAS: 'schemas'
};

// Database connection
let dbConnection: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// Initialize the database
const initDatabase = (): Promise<IDBDatabase> => {
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      dbConnection = request.result;
      console.log('Database is ready');
      resolve(dbConnection);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id', autoIncrement: true });
        usersStore.createIndex('email', 'email', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id', autoIncrement: true });
        projectsStore.createIndex('userId', 'userId', { unique: false });
        projectsStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SCHEMAS)) {
        const schemasStore = db.createObjectStore(STORES.SCHEMAS, { keyPath: 'id', autoIncrement: true });
        schemasStore.createIndex('projectId', 'projectId', { unique: false });
        schemasStore.createIndex('name', 'name', { unique: false });
      }
    };
  });

  return dbInitPromise;
};

// Get database connection
const getDB = async (): Promise<IDBDatabase> => {
  if (dbConnection) {
    return dbConnection;
  }
  return await initDatabase();
};

// Generic function to perform a transaction
const performTransaction = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Initialize the database
initDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

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
  /**
   * Creates a new user with the given details
   * @param email User's email address
   * @param password User's password
   * @param name User's name
   * @param position User's position (frontend or backend)
   * @param isAdmin Whether the user is an admin
   * @returns Promise resolving to the new user's ID
   */
  async create(
    email: string,
    password: string,
    name: string,
    position: 'frontend' | 'backend',
    isAdmin: boolean = false
  ): Promise<number> {
    try {
      // Convert email to lowercase for consistency
      const lowerEmail = email.toLowerCase();
      const passwordHash = CryptoJS.SHA256(password).toString();
      const now = new Date();

      return await performTransaction<number>(STORES.USERS, 'readwrite', (store) => {
        const user: User = {
          email: lowerEmail,
          name,
          position,
          numberOfProjects: 0,
          isAdmin,
          passwordHash,
          createdAt: now,
          updatedAt: now
        };
        return store.add(user);
      });
    } catch (error) {
      console.error('Error in create user:', error);
      throw new Error(`Database error while creating user: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Creates a new user by admin invitation
   * @param email User's email address
   * @param name User's name
   * @param position User's position (frontend or backend)
   * @param password User's initial password
   * @returns Promise resolving to the new user's ID
   */
  async createByAdmin(
    email: string,
    name: string,
    position: 'frontend' | 'backend',
    password: string
  ): Promise<number> {
    return this.create(email, password, name, position, false);
  },

  /**
   * Seeds the admin user if it doesn't exist
   * @returns Promise resolving to the admin user's ID or undefined if admin already exists
   */
  async seedAdmin(): Promise<number | undefined> {
    try {
      // Check if admin already exists
      const adminEmail = 'admin@gmail.com';
      const existingAdmin = await this.getByEmail(adminEmail);

      if (existingAdmin) {
        return undefined; // Admin already exists
      }

      // Create admin user
      return await this.create(
        adminEmail,
        'admin123',
        'Administrator',
        'backend',
        true
      );
    } catch (error) {
      console.error('Error in seedAdmin:', error);
      throw new Error(`Database error while seeding admin: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves a user by their email address
   * @param email Email address to search for
   * @returns Promise resolving to the user if found, undefined otherwise
   */
  async getByEmail(email: string): Promise<User | undefined> {
    try {
      // Convert email to lowercase for case-insensitive comparison
      const lowerEmail = email.toLowerCase();

      // Get all users from the store
      const users = await performTransaction<User[]>(STORES.USERS, 'readonly', (store) => {
        return store.getAll();
      });

      // Find the user with matching email (case-insensitive)
      return users.find(user => user.email.toLowerCase() === lowerEmail);
    } catch (error) {
      console.error('Error in getByEmail:', error);
      throw new Error(`Database error while retrieving user by email: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Authenticates a user with email and password
   * @param email User's email address
   * @param password User's password
   * @returns Promise resolving to the authenticated user or null if authentication fails
   */
  async authenticate(email: string, password: string): Promise<User | null> {
    try {
      // Get user with case-insensitive email comparison
      const user = await this.getByEmail(email);

      if (!user) {
        return null;
      }

      // Verify password
      const passwordHash = CryptoJS.SHA256(password).toString();
      if (user.passwordHash !== passwordHash) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves all users from the database
   * @returns Promise resolving to an array of all users
   */
  async getAll(): Promise<User[]> {
    try {
      return await performTransaction<User[]>(STORES.USERS, 'readonly', (store) => {
        return store.getAll();
      });
    } catch (error) {
      console.error('Error in getAll users:', error);
      throw new Error(`Database error while retrieving all users: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves a user by their ID
   * @param id User ID to search for
   * @returns Promise resolving to the user if found, undefined otherwise
   */
  async getById(id: number): Promise<User | undefined> {
    try {
      return await performTransaction<User | undefined>(STORES.USERS, 'readonly', (store) => {
        return store.get(id);
      });
    } catch (error) {
      console.error('Error in getById user:', error);
      throw new Error(`Database error while retrieving user by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Updates a user with the given data
   * @param id User ID to update
   * @param data Partial user data to update
   * @returns Promise resolving when the update is complete
   */
  async update(id: number, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      await performTransaction<IDBValidKey>(STORES.USERS, 'readwrite', async (store) => {
        // Get the existing user
        const request = store.get(id);

        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const user = request.result;
            if (!user) {
              reject(new Error(`User with ID ${id} not found`));
              return;
            }

            // Update the user with new data
            const updatedUser = {
              ...user,
              ...data,
              updatedAt: new Date()
            };

            // Put the updated user back in the store
            const updateRequest = store.put(updatedUser);
            updateRequest.onsuccess = () => resolve(updateRequest.result);
            updateRequest.onerror = () => reject(updateRequest.error);
          };

          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('Error in update user:', error);
      throw new Error(`Database error while updating user: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Deletes a user by their ID
   * @param id User ID to delete
   * @param currentUserId ID of the current user performing the deletion
   * @returns Promise resolving when the deletion is complete
   * @throws Error if attempting to delete the current user
   */
  async delete(id: number, currentUserId: number): Promise<void> {
    try {
      // Prevent users from deleting themselves
      if (id === currentUserId) {
        throw new Error('Users cannot delete their own accounts');
      }

      // Check if user exists
      const user = await this.getById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Delete the user
      await performTransaction<undefined>(STORES.USERS, 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error in delete user:', error);
      throw new Error(`Database error while deleting user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// CRUD operations for Project
export const projectOperations = {
  async create(userId: number, name: string, description?: string): Promise<number> {
    try {
      const now = new Date();

      return await performTransaction<number>(STORES.PROJECTS, 'readwrite', (store) => {
        const project: Project = {
          userId,
          name,
          description,
          createdAt: now,
          updatedAt: now
        };
        return store.add(project);
      });
    } catch (error) {
      console.error('Error in create project:', error);
      throw new Error(`Database error while creating project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getById(id: number): Promise<Project | undefined> {
    try {
      return await performTransaction<Project | undefined>(STORES.PROJECTS, 'readonly', (store) => {
        return store.get(id);
      });
    } catch (error) {
      console.error('Error in getById project:', error);
      throw new Error(`Database error while retrieving project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getByUserId(userId: number): Promise<Project[]> {
    try {
      const projects = await performTransaction<Project[]>(STORES.PROJECTS, 'readonly', (store) => {
        return store.getAll();
      });

      return projects.filter(project => project.userId === userId);
    } catch (error) {
      console.error('Error in getByUserId project:', error);
      throw new Error(`Database error while retrieving projects by user ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async update(id: number, data: Partial<Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      await performTransaction<IDBValidKey>(STORES.PROJECTS, 'readwrite', async (store) => {
        // Get the existing project
        const request = store.get(id);

        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const project = request.result;
            if (!project) {
              reject(new Error(`Project with ID ${id} not found`));
              return;
            }

            // Update the project with new data
            const updatedProject = {
              ...project,
              ...data,
              updatedAt: new Date()
            };

            // Put the updated project back in the store
            const updateRequest = store.put(updatedProject);
            updateRequest.onsuccess = () => resolve(updateRequest.result);
            updateRequest.onerror = () => reject(updateRequest.error);
          };

          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('Error in update project:', error);
      throw new Error(`Database error while updating project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async delete(id: number): Promise<void> {
    try {
      // First delete all schemas associated with this project
      const schemas = await schemaOperations.getByProjectId(id);
      for (const schema of schemas) {
        if (schema.id) {
          await schemaOperations.delete(schema.id);
        }
      }

      // Then delete the project
      await performTransaction<undefined>(STORES.PROJECTS, 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error in delete project:', error);
      throw new Error(`Database error while deleting project: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    try {
      const now = new Date();

      return await performTransaction<number>(STORES.SCHEMAS, 'readwrite', (store) => {
        const schema: Schema = {
          projectId,
          name,
          description,
          endpointUrl,
          schemaDefinition: encryptData(schemaDefinition), // Encrypt schema definition
          createdAt: now,
          updatedAt: now
        };
        return store.add(schema);
      });
    } catch (error) {
      console.error('Error in create schema:', error);
      throw new Error(`Database error while creating schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getById(id: number): Promise<Schema | undefined> {
    try {
      const schema = await performTransaction<Schema | undefined>(STORES.SCHEMAS, 'readonly', (store) => {
        return store.get(id);
      });

      if (schema) {
        // Decrypt schema definition
        schema.schemaDefinition = decryptData(schema.schemaDefinition);
      }

      return schema;
    } catch (error) {
      console.error('Error in getById schema:', error);
      throw new Error(`Database error while retrieving schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getByProjectId(projectId: number): Promise<Schema[]> {
    try {
      const schemas = await performTransaction<Schema[]>(STORES.SCHEMAS, 'readonly', (store) => {
        return store.getAll();
      });

      // Filter schemas by projectId and decrypt schema definitions
      return schemas
        .filter(schema => schema.projectId === projectId)
        .map(schema => ({
          ...schema,
          schemaDefinition: decryptData(schema.schemaDefinition)
        }));
    } catch (error) {
      console.error('Error in getByProjectId schema:', error);
      throw new Error(`Database error while retrieving schemas by project ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async update(
    id: number,
    data: Partial<Omit<Schema, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      await performTransaction<IDBValidKey>(STORES.SCHEMAS, 'readwrite', async (store) => {
        // Get the existing schema
        const request = store.get(id);

        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const schema = request.result;
            if (!schema) {
              reject(new Error(`Schema with ID ${id} not found`));
              return;
            }

            // Create update data with encrypted schema definition if provided
            const updateData = { ...data };
            if (updateData.schemaDefinition) {
              updateData.schemaDefinition = encryptData(updateData.schemaDefinition);
            }

            // Update the schema with new data
            const updatedSchema = {
              ...schema,
              ...updateData,
              updatedAt: new Date()
            };

            // Put the updated schema back in the store
            const updateRequest = store.put(updatedSchema);
            updateRequest.onsuccess = () => resolve(updateRequest.result);
            updateRequest.onerror = () => reject(updateRequest.error);
          };

          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('Error in update schema:', error);
      throw new Error(`Database error while updating schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await performTransaction<undefined>(STORES.SCHEMAS, 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error in delete schema:', error);
      throw new Error(`Database error while deleting schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
