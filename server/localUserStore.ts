import fs from 'fs';
import path from 'path';
import { User, InsertUser } from '../shared/schema';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 本地檔案用戶存儲類 - 將用戶數據保存在本地JSON檔案中
 */
export class LocalUserStore {
  private userFilePath: string;
  private users: User[] = [];
  private nextId: number = 1;
  private initialized: boolean = false;

  constructor(filePath: string = 'userData.json') {
    this.userFilePath = path.join(__dirname, '..', filePath);
    this.loadUsers().catch(err => {
      console.error('Error loading users from file:', err);
    });
  }

  /**
   * 從檔案加載用戶數據
   */
  private async loadUsers(): Promise<void> {
    try {
      // 檢查檔案是否存在
      if (fs.existsSync(this.userFilePath)) {
        const data = await fs.promises.readFile(this.userFilePath, 'utf8');
        const parsedData = JSON.parse(data);
        
        // 確保數據格式正確
        if (Array.isArray(parsedData)) {
          this.users = parsedData.map(user => ({
            ...user,
            createdAt: new Date(user.createdAt)
          }));
          
          // 找出最大ID以設置nextId
          if (this.users.length > 0) {
            this.nextId = Math.max(...this.users.map(u => u.id)) + 1;
          }
        }
      } else {
        // 如果檔案不存在，則創建空檔案
        await this.saveUsers();
      }
      
      this.initialized = true;
      console.log(`Loaded ${this.users.length} users from local storage`);
    } catch (error) {
      console.error('Error loading users from file:', error);
      this.users = [];
      this.initialized = true;
    }
  }

  /**
   * 保存用戶數據到檔案
   */
  private async saveUsers(): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.userFilePath,
        JSON.stringify(this.users, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving users to file:', error);
    }
  }

  /**
   * 確保初始化完成
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (this.initialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
  }

  /**
   * 根據ID獲取使用者
   */
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.id === id);
  }

  /**
   * 根據電子郵件獲取使用者
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.email === email);
  }

  /**
   * 根據使用者名稱獲取使用者
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.email === username);
  }

  /**
   * 創建新使用者
   */
  async createUser(userData: InsertUser): Promise<User> {
    await this.ensureInitialized();
    
    // 檢查電子郵件是否已存在
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('此電子郵件已註冊');
    }

    const id = this.nextId++;
    const createdAt = new Date();
    
    const newUser: User = {
      id,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt
    };
    
    this.users.push(newUser);
    await this.saveUsers();
    
    console.log(`Created new user: ${newUser.name} (${newUser.email})`);
    return newUser;
  }

  /**
   * 獲取所有使用者
   */
  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return [...this.users];
  }
}

// 創建單例實例
export const localUserStore = new LocalUserStore();