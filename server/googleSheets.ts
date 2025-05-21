/**
 * Define the user structure
 */
export interface SheetUser {
  id?: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

/**
 * Mock Google Sheets Service - simulates Google Sheets storage without actual API calls
 * This is used when we can't connect to the real Google Sheets API
 */
export class GoogleSheetsService {
  private users: SheetUser[] = [];
  private isInitialized = false;
  private nextId = 1;

  constructor() {
    console.log('Creating Google Sheets service (mock implementation)');
  }

  /**
   * Initialize the user sheet
   */
  async initializeUserSheet(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }
      
      console.log('Initializing mock user sheet...');
      
      // Load environment variables
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      console.log(`Using spreadsheet ID: ${spreadsheetId || 'not set'}`);
      
      // In a real implementation, we would initialize the connection to Google Sheets here
      
      this.isInitialized = true;
      console.log('Mock sheet initialization completed successfully');
    } catch (error) {
      console.error('Error initializing mock user sheet:', error);
      throw error;
    }
  }

  /**
   * Get all users from the in-memory storage
   */
  async getAllUsers(): Promise<SheetUser[]> {
    try {
      // Make sure the sheet is initialized
      if (!this.isInitialized) {
        await this.initializeUserSheet();
      }
      
      return [...this.users]; // Return a copy of the users array
    } catch (error) {
      console.error('Error getting users from mock storage:', error);
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<SheetUser | null> {
    try {
      // Make sure the sheet is initialized
      if (!this.isInitialized) {
        await this.initializeUserSheet();
      }
      
      const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return user || null;
    } catch (error) {
      console.error('Error getting user by email from mock storage:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(user: SheetUser): Promise<SheetUser> {
    try {
      // Make sure the sheet is initialized
      if (!this.isInitialized) {
        await this.initializeUserSheet();
      }
      
      // Check if user with the same email already exists
      const existingUser = await this.getUserByEmail(user.email);
      if (existingUser) {
        throw new Error(`此電子郵件已註冊`);
      }
      
      // Assign an ID and add to the users array
      const newUser: SheetUser = {
        ...user,
        id: this.nextId++
      };
      
      this.users.push(newUser);
      console.log(`Created new user in mock storage: ${newUser.name} (${newUser.email})`);
      
      return newUser;
    } catch (error) {
      console.error('Error creating user in mock storage:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<{success: boolean; user?: SheetUser; message: string}> {
    try {
      // Make sure the sheet is initialized
      if (!this.isInitialized) {
        await this.initializeUserSheet();
      }
      
      // Check if user exists
      const user = await this.getUserByEmail(email);
      
      // User not found
      if (!user) {
        return {
          success: false,
          message: "此電子郵件尚未註冊"
        };
      }
      
      // Check password
      if (user.password !== password) {
        return {
          success: false,
          message: "密碼錯誤，請再試一次"
        };
      }
      
      // Authentication successful
      return {
        success: true,
        user,
        message: "登入成功，歡迎回來！"
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw new Error("登入過程發生錯誤，請稍後再試");
    }
  }
}

// Create a singleton instance
export const googleSheetsService = new GoogleSheetsService();