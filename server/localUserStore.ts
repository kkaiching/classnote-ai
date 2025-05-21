import { User, InsertUser } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Simple file-based user storage that works in the current environment
// This is a local alternative to Google Sheets for user data
export class LocalUserStore {
  private userFilePath: string;
  private users: User[] = [];
  private nextId: number = 1;
  private initialized: boolean = false;

  constructor(filePath: string = 'userData.json') {
    this.userFilePath = filePath;
    this.loadUsers();
  }

  private async loadUsers() {
    try {
      // Check if the file exists
      if (fs.existsSync(this.userFilePath)) {
        const data = fs.readFileSync(this.userFilePath, 'utf8');
        const parsedData = JSON.parse(data);
        
        // Convert string dates back to Date objects
        this.users = parsedData.users.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }));
        
        this.nextId = parsedData.nextId;
      } else {
        // Initialize with empty users
        this.users = [];
        this.nextId = 1;
        await this.saveUsers();
      }
      
      this.initialized = true;
      console.log(`Loaded ${this.users.length} users from local storage`);
    } catch (error) {
      console.error('Error loading users from file:', error);
      this.users = [];
      this.nextId = 1;
      this.initialized = true;
    }
  }

  private async saveUsers() {
    try {
      const data = JSON.stringify({
        users: this.users,
        nextId: this.nextId
      }, null, 2);
      
      fs.writeFileSync(this.userFilePath, data, 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving users to file:', error);
      return false;
    }
  }

  // Wait for initialization to complete
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.loadUsers();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    // In our implementation, username is email
    return this.getUserByEmail(username);
  }

  async createUser(userData: InsertUser): Promise<User> {
    await this.ensureInitialized();
    
    // Generate new ID
    const id = this.nextId++;
    const createdAt = new Date();
    
    // Create user object
    const newUser: User = {
      id,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt
    };
    
    // Add to users array
    this.users.push(newUser);
    
    // Save to file
    await this.saveUsers();
    
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return [...this.users];
  }
}

// Export singleton instance
export const localUserStore = new LocalUserStore();