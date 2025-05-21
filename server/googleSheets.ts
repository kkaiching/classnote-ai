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
}

// Create a singleton instance
export const googleSheetsService = new GoogleSheetsService();