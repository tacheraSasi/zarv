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

export interface Resource {
  id?: number;
  projectId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id?: number;
  ownerId: number;  // The creator/owner of the project
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectUser {
  id?: number;
  projectId: number;
  userId: number;
  role: 'owner' | 'member';  // Role of the user in the project
  createdAt: Date;
}

export interface Schema {
  id?: number;
  projectId: number;
  creatorId: number;  // ID of the user who created the schema
  name: string;
  description?: string;
  endpointUrl?: string;
  schemaDefinition: string;
  httpMethod?: string;  // HTTP method (GET, POST, PUT, PATCH, DELETE)
  lastRequestBody?: string;  // Last JSON data used for testing the schema
  resource?: string;  // Resource category for grouping schemas (legacy)
  resourceId?: number;  // Reference to the resource in the resources store
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaVersion {
  id?: number;
  schemaId: number;
  userId: number;  // ID of the user who made the change
  timestamp: Date;
  schemaDefinition: string;  // Snapshot of the schema at this point in time
  name: string;  // Schema name at this point in time
  description?: string;  // Schema description at this point in time
  endpointUrl?: string;  // Schema endpoint URL at this point in time
  httpMethod?: string;  // HTTP method at this point in time
  lastRequestBody?: string;  // Last JSON data used for testing the schema
  resource?: string;  // Resource category for grouping schemas (legacy)
  resourceId?: number;  // Reference to the resource in the resources store
  changeDescription?: string;  // Description of what was changed
}

export interface ApiHeader {
  id?: number;
  name: string;
  value: string;
  enabled: boolean;
  scope: 'global' | 'project';
  projectId?: number;  // Only required for project-specific headers
  createdAt: Date;
  updatedAt: Date;
}

// Database name and version
const DB_NAME = 'SchemaManagerDatabase';
const DB_VERSION = 9; // Increased to handle resources as a separate store

// Store names
const STORES = {
  USERS: 'users',
  PROJECTS: 'projects',
  PROJECT_USERS: 'projectUsers',
  SCHEMAS: 'schemas',
  SCHEMA_VERSIONS: 'schemaVersions',
  API_HEADERS: 'apiHeaders',
  RESOURCES: 'resources'
};

// Database connection
let dbConnection: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// Function to reset the database (delete everything except admin user)
export const resetDatabase = async (): Promise<void> => {
  // Close any existing connection
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }

  // Reset the init promise
  dbInitPromise = null;

  // Delete the database
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onerror = () => {
      console.error('Failed to delete database:', deleteRequest.error);
      reject(deleteRequest.error);
    };

    deleteRequest.onsuccess = () => {
      console.log('Database deleted successfully');

      // Reinitialize the database
      initDatabase()
        .then(async () => {
          // Seed the admin user
          await userOperations.seedAdmin();
          console.log('Database reset complete. Admin user seeded.');
          resolve();
        })
        .catch(error => {
          console.error('Failed to reinitialize database:', error);
          reject(error);
        });
    };
  });
};

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
      const oldVersion = event.oldVersion;
      const transaction = request.transaction;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id', autoIncrement: true });
        usersStore.createIndex('email', 'email', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id', autoIncrement: true });
        projectsStore.createIndex('ownerId', 'ownerId', { unique: false });
        projectsStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PROJECT_USERS)) {
        const projectUsersStore = db.createObjectStore(STORES.PROJECT_USERS, { keyPath: 'id', autoIncrement: true });
        projectUsersStore.createIndex('projectId', 'projectId', { unique: false });
        projectUsersStore.createIndex('userId', 'userId', { unique: false });
        projectUsersStore.createIndex('projectUser', ['projectId', 'userId'], { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.SCHEMAS)) {
        const schemasStore = db.createObjectStore(STORES.SCHEMAS, { keyPath: 'id', autoIncrement: true });
        schemasStore.createIndex('projectId', 'projectId', { unique: false });
        schemasStore.createIndex('name', 'name', { unique: false });
        schemasStore.createIndex('creatorId', 'creatorId', { unique: false });
      } else if (oldVersion < 4) {
        // If upgrading from a version before 4, add the creatorId index to the existing SCHEMAS store
        const schemasStore = transaction.objectStore(STORES.SCHEMAS);
        if (!schemasStore.indexNames.contains('creatorId')) {
          schemasStore.createIndex('creatorId', 'creatorId', { unique: false });
        }
      }

      // Create schema versions store (new in version 4)
      if (!db.objectStoreNames.contains(STORES.SCHEMA_VERSIONS)) {
        const schemaVersionsStore = db.createObjectStore(STORES.SCHEMA_VERSIONS, { keyPath: 'id', autoIncrement: true });
        schemaVersionsStore.createIndex('schemaId', 'schemaId', { unique: false });
        schemaVersionsStore.createIndex('userId', 'userId', { unique: false });
        schemaVersionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create API headers store (new in version 5)
      if (!db.objectStoreNames.contains(STORES.API_HEADERS)) {
        const apiHeadersStore = db.createObjectStore(STORES.API_HEADERS, { keyPath: 'id', autoIncrement: true });
        apiHeadersStore.createIndex('name', 'name', { unique: false });
        apiHeadersStore.createIndex('scope', 'scope', { unique: false });
        apiHeadersStore.createIndex('projectId', 'projectId', { unique: false });
        apiHeadersStore.createIndex('scopeProject', ['scope', 'projectId'], { unique: false });
      }

      // Add httpMethod field to existing schemas (new in version 6)
      if (oldVersion < 6 && db.objectStoreNames.contains(STORES.SCHEMAS)) {
        console.log('Upgrading database to version 6: Adding httpMethod field to schemas');
        // We can't directly modify the schema of existing objects in IndexedDB
        // Instead, we'll set the httpMethod field to 'GET' for all schemas when they're accessed
      }

      // Add lastRequestBody field to existing schemas (new in version 7)
      if (oldVersion < 7 && db.objectStoreNames.contains(STORES.SCHEMAS)) {
        console.log('Upgrading database to version 7: Adding lastRequestBody field to schemas');
        // We can't directly modify the schema of existing objects in IndexedDB
        // The lastRequestBody field will be undefined for existing schemas until it's set
      }

      // Add resource field to existing schemas (new in version 8)
      if (oldVersion < 8 && db.objectStoreNames.contains(STORES.SCHEMAS)) {
        console.log('Upgrading database to version 8: Adding resource field to schemas');
        // We can't directly modify the schema of existing objects in IndexedDB
        // The resource field will be undefined for existing schemas until it's set

        // Add resource index to schemas store
        const schemasStore = transaction.objectStore(STORES.SCHEMAS);
        if (!schemasStore.indexNames.contains('resource')) {
          schemasStore.createIndex('resource', 'resource', {unique: false});
        }
      }

      // Create resources store (new in version 9)
      if (!db.objectStoreNames.contains(STORES.RESOURCES)) {
        console.log('Upgrading database to version 9: Adding resources store');
        const resourcesStore = db.createObjectStore(STORES.RESOURCES, {keyPath: 'id', autoIncrement: true});
        resourcesStore.createIndex('projectId', 'projectId', {unique: false});
        resourcesStore.createIndex('name', 'name', {unique: false});
        // Composite index for project+name uniqueness
        resourcesStore.createIndex('projectName', ['projectId', 'name'], {unique: true});
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
      // First get the user
      const user = await this.getById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Update the user with new data
      const updatedUser = {
        ...user,
        ...data,
        updatedAt: new Date()
      };

      // Put the updated user back in the store
      await performTransaction<IDBValidKey>(STORES.USERS, 'readwrite', (store) => {
        return store.put(updatedUser);
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
  /**
   * Creates a new project with the given user as the owner
   * @param userId ID of the user creating the project (will be set as owner)
   * @param name Name of the project
   * @param description Optional description of the project
   * @returns Promise resolving to the new project's ID
   */
  async create(userId: number, name: string, description?: string): Promise<number> {
    try {
      const now = new Date();

      // Create the project
      const projectId = await performTransaction<number>(STORES.PROJECTS, 'readwrite', (store) => {
        const project: Project = {
          ownerId: userId,
          name,
          description,
          createdAt: now,
          updatedAt: now
        };
        return store.add(project);
      });

      // Add the creator as the owner in the project_users table
      await projectUserOperations.addUserToProject(projectId, userId, 'owner');

      return projectId;
    } catch (error) {
      console.error('Error in create project:', error);
      throw new Error(`Database error while creating project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves a project by its ID
   * @param id Project ID to retrieve
   * @returns Promise resolving to the project if found, undefined otherwise
   */
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

  /**
   * Gets all projects a user has access to (either as owner or member)
   * @param userId ID of the user
   * @returns Promise resolving to an array of projects
   */
  async getByUserId(userId: number): Promise<Project[]> {
    try {
      // Get all project IDs the user has access to
      const projectIds = await projectUserOperations.getUserProjects(userId);

      // Get all projects
      const allProjects = await performTransaction<Project[]>(STORES.PROJECTS, 'readonly', (store) => {
        return store.getAll();
      });

      // Filter projects by the IDs the user has access to
      return allProjects.filter(project => projectIds.includes(project.id!));
    } catch (error) {
      console.error('Error in getByUserId project:', error);
      throw new Error(`Database error while retrieving projects by user ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all projects owned by a user
   * @param userId ID of the user
   * @returns Promise resolving to an array of projects
   */
  async getOwnedByUserId(userId: number): Promise<Project[]> {
    try {
      const projects = await performTransaction<Project[]>(STORES.PROJECTS, 'readonly', (store) => {
        return store.getAll();
      });

      return projects.filter(project => project.ownerId === userId);
    } catch (error) {
      console.error('Error in getOwnedByUserId project:', error);
      throw new Error(`Database error while retrieving projects owned by user: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Updates a project with the given data
   * @param id Project ID to update
   * @param userId ID of the user performing the update
   * @param data Partial project data to update
   * @returns Promise resolving when the update is complete
   * @throws Error if the user is not the project owner
   */
  async update(id: number, userId: number, data: Partial<Omit<Project, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      // First get the project
      const project = await this.getById(id);
      if (!project) {
        throw new Error(`Project with ID ${id} not found`);
      }

      // Check if the user is the project owner
      if (project.ownerId !== userId) {
        throw new Error('Only the project owner can update the project');
      }

      // Update the project with new data
      const updatedProject = {
        ...project,
        ...data,
        updatedAt: new Date()
      };

      // Put the updated project back in the store
      await performTransaction<IDBValidKey>(STORES.PROJECTS, 'readwrite', (store) => {
        return store.put(updatedProject);
      });
    } catch (error) {
      console.error('Error in update project:', error);
      throw new Error(`Database error while updating project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Deletes a project and all associated data
   * @param id Project ID to delete
   * @param userId ID of the user performing the deletion
   * @returns Promise resolving when the deletion is complete
   * @throws Error if the user is not the project owner
   */
  async delete(id: number, userId?: number): Promise<void> {
    try {
      // First get the project
      const project = await this.getById(id);
      if (!project) {
        throw new Error(`Project with ID ${id} not found`);
      }

      // If userId is provided, check if the user is the project owner
      if (userId !== undefined && project.ownerId !== userId) {
        throw new Error('Only the project owner can delete the project');
      }

      // First delete all schemas associated with this project
      const schemas = await schemaOperations.getByProjectId(id);
      for (const schema of schemas) {
        if (schema.id) {
          await schemaOperations.delete(schema.id);
        }
      }

      // Delete all project user records
      const projectUsers = await projectUserOperations.getProjectUsers(id);
      for (const projectUser of projectUsers) {
        if (projectUser.id) {
          await performTransaction<undefined>(STORES.PROJECT_USERS, 'readwrite', (store) => {
            return store.delete(projectUser.id!);
          });
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

// CRUD operations for ProjectUser
export const projectUserOperations = {
  /**
   * Adds a user to a project
   * @param projectId ID of the project
   * @param userId ID of the user to add
   * @param role Role of the user in the project ('owner' or 'member')
   * @returns Promise resolving to the new project user ID
   */
  async addUserToProject(projectId: number, userId: number, role: 'owner' | 'member'): Promise<number> {
    try {
      const now = new Date();

      // Check if the user is already in the project
      const existingProjectUser = await this.getProjectUser(projectId, userId);
      if (existingProjectUser) {
        throw new Error(`User is already a member of this project`);
      }

      return await performTransaction<number>(STORES.PROJECT_USERS, 'readwrite', (store) => {
        const projectUser: ProjectUser = {
          projectId,
          userId,
          role,
          createdAt: now
        };
        return store.add(projectUser);
      });
    } catch (error) {
      console.error('Error in addUserToProject:', error);
      throw new Error(`Database error while adding user to project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Removes a user from a project
   * @param projectId ID of the project
   * @param userId ID of the user to remove
   * @returns Promise resolving when the removal is complete
   */
  async removeUserFromProject(projectId: number, userId: number): Promise<void> {
    try {
      // Get the project user record
      const projectUser = await this.getProjectUser(projectId, userId);
      if (!projectUser) {
        throw new Error(`User is not a member of this project`);
      }

      // Don't allow removing the owner
      if (projectUser.role === 'owner') {
        throw new Error(`Cannot remove the project owner`);
      }

      // Remove the user from the project
      await performTransaction<undefined>(STORES.PROJECT_USERS, 'readwrite', (store) => {
        return store.delete(projectUser.id!);
      });
    } catch (error) {
      console.error('Error in removeUserFromProject:', error);
      throw new Error(`Database error while removing user from project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all users in a project
   * @param projectId ID of the project
   * @returns Promise resolving to an array of project users
   */
  async getProjectUsers(projectId: number): Promise<ProjectUser[]> {
    try {
      const projectUsers = await performTransaction<ProjectUser[]>(STORES.PROJECT_USERS, 'readonly', (store) => {
        return store.getAll();
      });

      return projectUsers.filter(pu => pu.projectId === projectId);
    } catch (error) {
      console.error('Error in getProjectUsers:', error);
      throw new Error(`Database error while getting project users: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all projects a user is a member of
   * @param userId ID of the user
   * @returns Promise resolving to an array of project IDs
   */
  async getUserProjects(userId: number): Promise<number[]> {
    try {
      const projectUsers = await performTransaction<ProjectUser[]>(STORES.PROJECT_USERS, 'readonly', (store) => {
        return store.getAll();
      });

      return projectUsers
        .filter(pu => pu.userId === userId)
        .map(pu => pu.projectId);
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      throw new Error(`Database error while getting user projects: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets a specific project user record
   * @param projectId ID of the project
   * @param userId ID of the user
   * @returns Promise resolving to the project user record if found, undefined otherwise
   */
  async getProjectUser(projectId: number, userId: number): Promise<ProjectUser | undefined> {
    try {
      const projectUsers = await performTransaction<ProjectUser[]>(STORES.PROJECT_USERS, 'readonly', (store) => {
        return store.getAll();
      });

      return projectUsers.find(pu => pu.projectId === projectId && pu.userId === userId);
    } catch (error) {
      console.error('Error in getProjectUser:', error);
      throw new Error(`Database error while getting project user: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Checks if a user is a member of a project
   * @param projectId ID of the project
   * @param userId ID of the user
   * @returns Promise resolving to true if the user is a member, false otherwise
   */
  async isUserInProject(projectId: number, userId: number): Promise<boolean> {
    try {
      const projectUser = await this.getProjectUser(projectId, userId);
      return !!projectUser;
    } catch (error) {
      console.error('Error in isUserInProject:', error);
      throw new Error(`Database error while checking if user is in project: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Checks if a user is the owner of a project
   * @param projectId ID of the project
   * @param userId ID of the user
   * @returns Promise resolving to true if the user is the owner, false otherwise
   */
  async isProjectOwner(projectId: number, userId: number): Promise<boolean> {
    try {
      const projectUser = await this.getProjectUser(projectId, userId);
      return !!projectUser && projectUser.role === 'owner';
    } catch (error) {
      console.error('Error in isProjectOwner:', error);
      throw new Error(`Database error while checking if user is project owner: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// CRUD operations for Resource
export const resourceOperations = {
  /**
   * Creates a new resource for a project
   * @param projectId ID of the project
   * @param name Name of the resource
   * @returns Promise resolving to the new resource's ID
   */
  async create(projectId: number, name: string): Promise<number> {
    try {
      const now = new Date();

      // Check if a resource with this name already exists in the project
      const existingResources = await this.getByProjectId(projectId);
      const existingResource = existingResources.find(r => r.name.toLowerCase() === name.toLowerCase());

      if (existingResource) {
        return existingResource.id!; // Return existing resource ID if found
      }

      // Create the resource
      return await performTransaction<number>(STORES.RESOURCES, 'readwrite', (store) => {
        const resource: Resource = {
          projectId,
          name,
          createdAt: now,
          updatedAt: now
        };
        return store.add(resource);
      });
    } catch (error) {
      console.error('Error in create resource:', error);
      throw new Error(`Database error while creating resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves a resource by its ID
   * @param id Resource ID to retrieve
   * @returns Promise resolving to the resource if found, undefined otherwise
   */
  async getById(id: number): Promise<Resource | undefined> {
    try {
      return await performTransaction<Resource | undefined>(STORES.RESOURCES, 'readonly', (store) => {
        return store.get(id);
      });
    } catch (error) {
      console.error('Error in getById resource:', error);
      throw new Error(`Database error while retrieving resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all resources for a project
   * @param projectId ID of the project
   * @returns Promise resolving to an array of resources
   */
  async getByProjectId(projectId: number): Promise<Resource[]> {
    try {
      const resources = await performTransaction<Resource[]>(STORES.RESOURCES, 'readonly', (store) => {
        return store.getAll();
      });

      return resources.filter(resource => resource.projectId === projectId);
    } catch (error) {
      console.error('Error in getByProjectId resource:', error);
      throw new Error(`Database error while retrieving resources by project ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Updates a resource with the given data
   * @param id Resource ID to update
   * @param data Partial resource data to update
   * @returns Promise resolving when the update is complete
   */
  async update(id: number, data: Partial<Omit<Resource, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      // First get the resource
      const resource = await this.getById(id);
      if (!resource) {
        throw new Error(`Resource with ID ${id} not found`);
      }

      // Update the resource with new data
      const updatedResource = {
        ...resource,
        ...data,
        updatedAt: new Date()
      };

      // Put the updated resource back in the store
      await performTransaction<IDBValidKey>(STORES.RESOURCES, 'readwrite', (store) => {
        return store.put(updatedResource);
      });
    } catch (error) {
      console.error('Error in update resource:', error);
      throw new Error(`Database error while updating resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Deletes a resource by its ID
   * @param id Resource ID to delete
   * @returns Promise resolving when the deletion is complete
   */
  async delete(id: number): Promise<void> {
    try {
      // Check if resource exists
      const resource = await this.getById(id);
      if (!resource) {
        throw new Error(`Resource with ID ${id} not found`);
      }

      // Get all schemas that reference this resource
      const schemas = await schemaOperations.getByResourceId(id);

      // Update schemas to remove the resource reference
      for (const schema of schemas) {
        if (schema.id) {
          await schemaOperations.update(schema.id, {
            resourceId: undefined,
            resource: undefined
          });
        }
      }

      // Delete the resource
      await performTransaction<undefined>(STORES.RESOURCES, 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error in delete resource:', error);
      throw new Error(`Database error while deleting resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets or creates a resource by name for a project
   * @param projectId ID of the project
   * @param name Name of the resource
   * @returns Promise resolving to the resource ID
   */
  async getOrCreate(projectId: number, name: string): Promise<number> {
    try {
      if (!name) {
        return 0; // Return 0 for empty resource names
      }

      const resources = await this.getByProjectId(projectId);
      const existingResource = resources.find(r => r.name.toLowerCase() === name.toLowerCase());

      if (existingResource) {
        return existingResource.id!;
      }

      return await this.create(projectId, name);
    } catch (error) {
      console.error('Error in getOrCreate resource:', error);
      throw new Error(`Database error while getting or creating resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// CRUD operations for Schema
export const schemaOperations = {
  /**
   * Gets all unique resources for a project
   * @param projectId ID of the project
   * @returns Promise resolving to an array of unique resource names
   * @deprecated Use resourceOperations.getByProjectId instead
   */
  async getResourcesByProjectId(projectId: number): Promise<string[]> {
    try {
      const schemas = await this.getByProjectId(projectId);

      // Extract unique resources
      const resourceSet = new Set<string>();

      schemas.forEach(schema => {
        if (schema.resource) {
          resourceSet.add(schema.resource);
        }
      });

      // Convert Set to Array and sort alphabetically
      return Array.from(resourceSet).sort();
    } catch (error) {
      console.error('Error in getResourcesByProjectId:', error);
      throw new Error(`Database error while retrieving resources by project ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all schemas that reference a specific resource
   * @param resourceId ID of the resource
   * @returns Promise resolving to an array of schemas
   */
  async getByResourceId(resourceId: number): Promise<Schema[]> {
    try {
      const schemas = await performTransaction<Schema[]>(STORES.SCHEMAS, 'readonly', (store) => {
        return store.getAll();
      });

      return schemas.filter(schema => schema.resourceId === resourceId);
    } catch (error) {
      console.error('Error in getByResourceId:', error);
      throw new Error(`Database error while retrieving schemas by resource ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async create(
    projectId: number,
    name: string,
    schemaDefinition: string,
    description?: string,
    endpointUrl?: string,
    creatorId?: number,
    httpMethod: string = 'GET',
    resource?: string
  ): Promise<number> {
    try {
      const now = new Date();

      // If creatorId is not provided, try to get the current user ID
      if (!creatorId) {
        console.warn('Schema created without specifying a creator ID');
      }

      // Get or create resource if provided
      let resourceId: number | undefined = undefined;
      if (resource) {
        try {
          resourceId = await resourceOperations.getOrCreate(projectId, resource);
        } catch (resourceError) {
          console.error('Error getting or creating resource:', resourceError);
          // Continue with creation even if resource handling fails
        }
      }

      const schemaId = await performTransaction<number>(STORES.SCHEMAS, 'readwrite', (store) => {
        const schema: Schema = {
          projectId,
          creatorId: creatorId || 0, // Default to 0 if no creator ID is provided
          name,
          description,
          endpointUrl,
          schemaDefinition: encryptData(schemaDefinition), // Encrypt schema definition
          httpMethod,
          lastRequestBody: undefined, // Initialize as undefined
          resource, // Keep legacy resource field for backward compatibility
          resourceId, // Add resourceId field
          createdAt: now,
          updatedAt: now
        };
        return store.add(schema);
      });

      // If a creator ID is provided, create an initial version record
      if (creatorId && schemaId) {
        try {
          await this.saveVersion(schemaId, creatorId, {
            name,
            schemaDefinition,
            description,
            endpointUrl,
            httpMethod,
            lastRequestBody: undefined,
            resource,
            resourceId
          }, 'Initial version');
        } catch (versionError) {
          // Log the error but don't fail the schema creation
          console.warn('Failed to save initial schema version:', versionError);
          console.warn('Schema created successfully, but version history could not be saved.');
        }
      }

      return schemaId;
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
    data: Partial<Omit<Schema, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    userId?: number
  ): Promise<void> {
    try {
      // First get the schema
      const schema = await this.getById(id);
      if (!schema) {
        throw new Error(`Schema with ID ${id} not found`);
      }

      // Create update data with encrypted schema definition if provided
      const updateData = { ...data };
      if (updateData.schemaDefinition) {
        updateData.schemaDefinition = encryptData(updateData.schemaDefinition);
      }

      // Handle resource update - get or create resource if provided
      if (updateData.resource !== undefined) {
        try {
          // If resource is empty, set resourceId to undefined
          if (!updateData.resource) {
            updateData.resourceId = undefined;
          } else {
            // Get or create the resource
            updateData.resourceId = await resourceOperations.getOrCreate(schema.projectId, updateData.resource);
          }
        } catch (resourceError) {
          console.error('Error getting or creating resource during schema update:', resourceError);
          // Continue with update even if resource handling fails
        }
      }

      // Update the schema with new data
      const updatedSchema = {
        ...schema,
        ...updateData,
        // Re-encrypt the schema definition since getById decrypts it
        schemaDefinition: updateData.schemaDefinition || encryptData(schema.schemaDefinition),
        updatedAt: new Date()
      };

      // Put the updated schema back in the store
      await performTransaction<IDBValidKey>(STORES.SCHEMAS, 'readwrite', (store) => {
        return store.put(updatedSchema);
      });

      // If userId is provided, save a version record
      if (userId && (data.name || data.description || data.endpointUrl || data.schemaDefinition)) {
        try {
          // Create a change description based on what was updated
          const changes: string[] = [];
          if (data.name) changes.push('name');
          if (data.description) changes.push('description');
          if (data.endpointUrl) changes.push('endpoint URL');
          if (data.schemaDefinition) changes.push('schema definition');
          if (data.httpMethod) changes.push('HTTP method');
          if (data.lastRequestBody) changes.push('last request body');
          if (data.resource || data.resourceId !== undefined) changes.push('resource');

          const changeDescription = `Updated ${changes.join(', ')}`;

          // Save the version with the decrypted schema definition
          await this.saveVersion(id, userId, {
            name: data.name || schema.name,
            schemaDefinition: data.schemaDefinition || schema.schemaDefinition, // Already decrypted by getById
            description: data.description !== undefined ? data.description : schema.description,
            endpointUrl: data.endpointUrl !== undefined ? data.endpointUrl : schema.endpointUrl,
            httpMethod: data.httpMethod !== undefined ? data.httpMethod : schema.httpMethod,
            lastRequestBody: data.lastRequestBody !== undefined ? data.lastRequestBody : schema.lastRequestBody,
            resource: data.resource !== undefined ? data.resource : schema.resource,
            resourceId: data.resourceId !== undefined ? data.resourceId : schema.resourceId
          }, changeDescription);
        } catch (versionError) {
          // Log the error but don't fail the schema update
          console.warn('Failed to save schema version during update:', versionError);
          console.warn('Schema updated successfully, but version history could not be saved.');

          // If it's a quota error, provide more specific information
          if (versionError instanceof Error &&
              (versionError.name === 'QuotaExceededError' ||
               versionError.message.includes('quota') ||
               versionError.message.includes('QUOTA_BYTES_PER_ITEM'))) {
            console.warn('Browser storage quota exceeded. This typically happens with very large schemas.');
          }
        }
      }
    } catch (error) {
      console.error('Error in update schema:', error);
      throw new Error(`Database error while updating schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async delete(id: number, userId?: number): Promise<void> {
    try {
      // If userId is provided, save a final version record before deletion
      if (userId) {
        try {
          const schema = await this.getById(id);
          if (schema) {
            await this.saveVersion(id, userId, {
              name: schema.name,
              schemaDefinition: schema.schemaDefinition,
              description: schema.description,
              endpointUrl: schema.endpointUrl,
              httpMethod: schema.httpMethod,
              lastRequestBody: schema.lastRequestBody,
              resource: schema.resource,
              resourceId: schema.resourceId
            }, 'Schema deleted');
          }
        } catch (versionError) {
          // Log the error but don't fail the schema deletion
          console.warn('Failed to save final schema version during deletion:', versionError);
          console.warn('Schema will be deleted, but the final version history record could not be saved.');

          // If it's a quota error, provide more specific information
          if (versionError instanceof Error &&
              (versionError.name === 'QuotaExceededError' ||
               versionError.message.includes('quota') ||
               versionError.message.includes('QUOTA_BYTES_PER_ITEM'))) {
            console.warn('Browser storage quota exceeded. This typically happens with very large schemas.');
          }
        }
      }

      // Delete the schema
      await performTransaction<undefined>(STORES.SCHEMAS, 'readwrite', (store) => {
        return store.delete(id);
      });

      // Note: We're not deleting version history, as it might be useful to keep it
    } catch (error) {
      console.error('Error in delete schema:', error);
      throw new Error(`Database error while deleting schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Saves a version of a schema
   * @param schemaId ID of the schema
   * @param userId ID of the user making the change
   * @param schemaData Schema data to save
   * @param changeDescription Description of what was changed
   * @returns Promise resolving to the new version ID
   */
  async saveVersion(
    schemaId: number,
    userId: number,
    schemaData: {
      name: string;
      schemaDefinition: string;
      description?: string;
      endpointUrl?: string;
      httpMethod?: string;
      lastRequestBody?: string;
      resource?: string;
      resourceId?: number;
    },
    changeDescription?: string
  ): Promise<number> {
    try {
      const timestamp = new Date();

      // Check if the database has been upgraded to include the SCHEMA_VERSIONS store
      const db = await getDB();
      if (!db.objectStoreNames.contains(STORES.SCHEMA_VERSIONS)) {
        console.warn('SCHEMA_VERSIONS store not found in database. Schema version history will not be saved.');
        console.warn('Please reload the application to upgrade the database.');
        return -1; // Return a dummy ID to allow the operation to continue
      }

      // Calculate a hash of the schema definition to use as a reference
      const schemaHash = CryptoJS.SHA256(schemaData.schemaDefinition).toString();

      // Truncate the schema definition if it's too large (limit to ~50KB before encryption)
      // This helps prevent exceeding IndexedDB's quota limits
      let truncatedDefinition = schemaData.schemaDefinition;
      const MAX_SCHEMA_LENGTH = 50000; // ~50KB
      let isTruncated = false;

      if (truncatedDefinition.length > MAX_SCHEMA_LENGTH) {
        truncatedDefinition = truncatedDefinition.substring(0, MAX_SCHEMA_LENGTH);
        isTruncated = true;
        console.warn(`Schema definition truncated for version history (original size: ${schemaData.schemaDefinition.length} chars)`);
      }

      return await performTransaction<number>(STORES.SCHEMA_VERSIONS, 'readwrite', (store) => {
        const schemaVersion: SchemaVersion = {
          schemaId,
          userId,
          timestamp,
          name: schemaData.name,
          // Store the truncated definition or just the hash if severely truncated
          schemaDefinition: isTruncated
            ? encryptData(truncatedDefinition + `\n\n/* Schema truncated. Full length: ${schemaData.schemaDefinition.length} chars, hash: ${schemaHash} */`)
            : encryptData(truncatedDefinition),
          description: schemaData.description,
          endpointUrl: schemaData.endpointUrl,
          httpMethod: schemaData.httpMethod,
          lastRequestBody: schemaData.lastRequestBody,
          resource: schemaData.resource,
          resourceId: schemaData.resourceId,
          changeDescription: isTruncated
            ? (changeDescription || '') + ' (Note: Schema definition truncated for storage)'
            : changeDescription
        };
        return store.add(schemaVersion);
      });
    } catch (error) {
      console.error('Error in saveVersion:', error);

      // Check specifically for quota exceeded errors
      if (error instanceof Error &&
          (error.name === 'QuotaExceededError' ||
           error.message.includes('quota') ||
           error.message.includes('QUOTA_BYTES_PER_ITEM'))) {
        console.warn('Storage quota exceeded when saving schema version. Version history will be limited.');
        return -1;
      }

      // For other errors, log a warning and return a dummy ID
      // This allows schema creation to succeed even if version history can't be saved
      console.warn('Failed to save schema version. This may be because the database needs to be upgraded.');
      console.warn('Please reload the application to upgrade the database.');
      return -1;
    }
  },

  /**
   * Gets all versions of a schema
   * @param schemaId ID of the schema
   * @returns Promise resolving to an array of schema versions
   */
  async getVersions(schemaId: number): Promise<SchemaVersion[]> {
    try {
      // Check if the database has been upgraded to include the SCHEMA_VERSIONS store
      const db = await getDB();
      if (!db.objectStoreNames.contains(STORES.SCHEMA_VERSIONS)) {
        console.warn('SCHEMA_VERSIONS store not found in database. Schema version history is not available.');
        console.warn('Please reload the application to upgrade the database.');
        return []; // Return an empty array to allow the operation to continue
      }

      const versions = await performTransaction<SchemaVersion[]>(STORES.SCHEMA_VERSIONS, 'readonly', (store) => {
        return store.getAll();
      });

      // Filter versions by schemaId and decrypt schema definitions
      return versions
        .filter(version => version.schemaId === schemaId)
        .map(version => {
          try {
            // Decrypt the schema definition
            const decryptedDefinition = decryptData(version.schemaDefinition);

            return {
              ...version,
              schemaDefinition: decryptedDefinition
            };
          } catch (decryptError) {
            console.error('Error decrypting schema definition:', decryptError);
            // If decryption fails, return a placeholder
            return {
              ...version,
              schemaDefinition: '/* Error decrypting schema definition. This may be due to data corruption or browser storage limitations. */'
            };
          }
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp, newest first
    } catch (error) {
      console.error('Error in getVersions:', error);
      // Instead of throwing an error, log a warning and return an empty array
      console.warn('Failed to retrieve schema versions. This may be because the database needs to be upgraded.');
      console.warn('Please reload the application to upgrade the database.');
      return [];
    }
  },

  /**
   * Gets a specific version of a schema
   * @param versionId ID of the version
   * @returns Promise resolving to the schema version if found, undefined otherwise
   */
  async getVersionById(versionId: number): Promise<SchemaVersion | undefined> {
    try {
      // Check if the database has been upgraded to include the SCHEMA_VERSIONS store
      const db = await getDB();
      if (!db.objectStoreNames.contains(STORES.SCHEMA_VERSIONS)) {
        console.warn('SCHEMA_VERSIONS store not found in database. Schema version history is not available.');
        console.warn('Please reload the application to upgrade the database.');
        return undefined; // Return undefined to allow the operation to continue
      }

      const version = await performTransaction<SchemaVersion | undefined>(STORES.SCHEMA_VERSIONS, 'readonly', (store) => {
        return store.get(versionId);
      });

      if (version) {
        try {
          // Decrypt schema definition
          version.schemaDefinition = decryptData(version.schemaDefinition);
        } catch (decryptError) {
          console.error('Error decrypting schema definition:', decryptError);
          // If decryption fails, provide a placeholder
          version.schemaDefinition = '/* Error decrypting schema definition. This may be due to data corruption or browser storage limitations. */';
        }
      }

      return version;
    } catch (error) {
      console.error('Error in getVersionById:', error);
      // Instead of throwing an error, log a warning and return undefined
      console.warn('Failed to retrieve schema version. This may be because the database needs to be upgraded.');
      console.warn('Please reload the application to upgrade the database.');
      return undefined;
    }
  },

  /**
   * Gets the creator of a schema
   * @param schemaId ID of the schema
   * @returns Promise resolving to the user who created the schema, or undefined if not found
   */
  async getCreator(schemaId: number): Promise<User | undefined> {
    try {
      const schema = await this.getById(schemaId);
      if (!schema) {
        return undefined;
      }

      // Handle case where creatorId might not exist in older schemas
      if (!('creatorId' in schema) || !schema.creatorId) {
        console.warn(`Schema ${schemaId} does not have a creatorId. This may be because it was created before creator tracking was added.`);
        return undefined;
      }

      return await userOperations.getById(schema.creatorId);
    } catch (error) {
      console.error('Error in getCreator:', error);
      // Instead of throwing an error, log a warning and return undefined
      console.warn('Failed to retrieve schema creator. This may be because the schema was created before creator tracking was added.');
      return undefined;
    }
  }
};

// CRUD operations for API Headers
export const apiHeaderOperations = {
  /**
   * Creates a new API header
   * @param name Header name
   * @param value Header value
   * @param enabled Whether the header is enabled
   * @param scope Scope of the header (global or project)
   * @param projectId ID of the project (required for project-specific headers)
   * @returns Promise resolving to the new header's ID
   */
  async create(
    name: string,
    value: string,
    enabled: boolean = true,
    scope: 'global' | 'project',
    projectId?: number
  ): Promise<number> {
    try {
      // Validate that projectId is provided for project-specific headers
      if (scope === 'project' && !projectId) {
        throw new Error('Project ID is required for project-specific headers');
      }

      const now = new Date();

      return await performTransaction<number>(STORES.API_HEADERS, 'readwrite', (store) => {
        const header: ApiHeader = {
          name,
          value,
          enabled,
          scope,
          projectId,
          createdAt: now,
          updatedAt: now
        };
        return store.add(header);
      });
    } catch (error) {
      console.error('Error in create API header:', error);
      throw new Error(`Database error while creating API header: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets an API header by ID
   * @param id ID of the header
   * @returns Promise resolving to the header if found, undefined otherwise
   */
  async getById(id: number): Promise<ApiHeader | undefined> {
    try {
      return await performTransaction<ApiHeader | undefined>(STORES.API_HEADERS, 'readonly', (store) => {
        return store.get(id);
      });
    } catch (error) {
      console.error('Error in getById:', error);
      throw new Error(`Database error while retrieving API header: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all API headers
   * @returns Promise resolving to an array of all headers
   */
  async getAll(): Promise<ApiHeader[]> {
    try {
      return await performTransaction<ApiHeader[]>(STORES.API_HEADERS, 'readonly', (store) => {
        return store.getAll();
      });
    } catch (error) {
      console.error('Error in getAll:', error);
      throw new Error(`Database error while retrieving API headers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all global API headers
   * @returns Promise resolving to an array of global headers
   */
  async getGlobalHeaders(): Promise<ApiHeader[]> {
    try {
      const headers = await this.getAll();
      return headers.filter(header => header.scope === 'global');
    } catch (error) {
      console.error('Error in getGlobalHeaders:', error);
      throw new Error(`Database error while retrieving global API headers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all project-specific API headers for a project
   * @param projectId ID of the project
   * @returns Promise resolving to an array of project-specific headers
   */
  async getProjectHeaders(projectId: number): Promise<ApiHeader[]> {
    try {
      const headers = await this.getAll();
      return headers.filter(header => header.scope === 'project' && header.projectId === projectId);
    } catch (error) {
      console.error('Error in getProjectHeaders:', error);
      throw new Error(`Database error while retrieving project API headers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Gets all headers applicable to a project (global headers + project-specific headers)
   * @param projectId ID of the project
   * @returns Promise resolving to an array of applicable headers
   */
  async getApplicableHeaders(projectId: number): Promise<ApiHeader[]> {
    try {
      const headers = await this.getAll();
      return headers.filter(header =>
          (header.scope === 'global') ||
        (header.scope === 'project' && header.projectId === projectId)
      );
    } catch (error) {
      console.error('Error in getApplicableHeaders:', error);
      throw new Error(`Database error while retrieving applicable API headers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Updates an API header
   * @param id ID of the header to update
   * @param updates Object containing the fields to update
   * @returns Promise resolving to the updated header's ID if successful, false if header not found
   */
  async update(
    id: number,
    updates: {
      name?: string;
      value?: string;
      enabled?: boolean;
      scope?: 'global' | 'project';
      projectId?: number;
    }
  ): Promise<IDBValidKey | false> {
    try {
      // Validate that projectId is provided for project-specific headers
      if (updates.scope === 'project' && !updates.projectId) {
        const existingHeader = await this.getById(id);
        if (!existingHeader || !existingHeader.projectId) {
          throw new Error('Project ID is required for project-specific headers');
        }
      }

      const header = await this.getById(id);
      if (!header) {
        return false;
      }

      return await performTransaction<IDBValidKey>(STORES.API_HEADERS, 'readwrite', (store) => {
        const updatedHeader: ApiHeader = {
          ...header,
          ...updates,
          updatedAt: new Date()
        };
        return store.put(updatedHeader);
      });
    } catch (error) {
      console.error('Error in update:', error);
      throw new Error(`Database error while updating API header: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Deletes an API header
   * @param id ID of the header to delete
   * @returns Promise resolving to undefined if successful, false if header not found
   */
  async delete(id: number): Promise<undefined | false> {
    try {
      const header = await this.getById(id);
      if (!header) {
        return false;
      }

      return await performTransaction<undefined>(STORES.API_HEADERS, 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error in delete:', error);
      throw new Error(`Database error while deleting API header: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
