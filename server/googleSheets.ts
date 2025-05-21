import { google, sheets_v4 } from 'googleapis';

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
 * Google Sheets Service - integrates with Google Sheets API to store and retrieve user data
 */
export class GoogleSheetsService {
  private users: SheetUser[] = [];
  private isInitialized = false;
  private nextId = 1;
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string = '';
  private userSheetName = 'Users'; // Name of the sheet tab for users
  private useMockStorage = false;

  constructor() {
    console.log('Initializing Google Sheets service');
  }

  /**
   * Initialize Google Sheets connection and user sheet
   */
  async initializeUserSheet(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }
      
      // Get required environment variables
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!spreadsheetId || !clientEmail || !privateKey) {
        console.warn('Missing Google Sheets credentials. Falling back to mock storage.');
        this.useMockStorage = true;
        this.isInitialized = true;
        return;
      }

      this.spreadsheetId = spreadsheetId;
      console.log(`Using spreadsheet ID: ${this.spreadsheetId}`);
      
      try {
        // Initialize Google Sheets API client
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        this.sheets = google.sheets({ version: 'v4', auth });
        
        // Check if the User sheet exists, create it if not
        await this.ensureUserSheetExists();
        
        // Load existing users from Google Sheets
        await this.loadUsersFromSheet();
        
        console.log('Google Sheets initialization completed successfully');
      } catch (apiError) {
        console.error('Error connecting to Google Sheets API:', apiError);
        console.warn('Falling back to mock storage');
        this.useMockStorage = true;
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      console.warn('Falling back to mock storage');
      this.useMockStorage = true;
      this.isInitialized = true;
    }
  }

  /**
   * Ensure that the Users sheet exists, create it if not
   */
  private async ensureUserSheetExists(): Promise<void> {
    if (!this.sheets || this.useMockStorage) return;
    
    try {
      // Get info about the spreadsheet
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      // Check if Users sheet exists
      const userSheetExists = response.data.sheets?.some(
        sheet => sheet.properties?.title === this.userSheetName
      );
      
      if (!userSheetExists) {
        // Create Users sheet with headers
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.userSheetName,
                  },
                },
              },
            ],
          },
        });
        
        // Add headers to the Users sheet
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.userSheetName}!A1:E1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['id', 'name', 'email', 'password', 'createdAt']],
          },
        });
        
        console.log(`Created ${this.userSheetName} sheet with headers`);
      }
    } catch (error) {
      console.error('Error ensuring user sheet exists:', error);
      throw error;
    }
  }

  /**
   * Load all users from Google Sheets
   */
  private async loadUsersFromSheet(): Promise<void> {
    if (!this.sheets || this.useMockStorage) return;
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.userSheetName}!A2:E`, // Skip header row
      });
      
      const rows = response.data.values || [];
      this.users = [];
      
      // Parse user data from rows
      rows.forEach((row, index) => {
        if (row.length >= 5) {
          const user: SheetUser = {
            id: parseInt(row[0]) || index + 1,
            name: row[1],
            email: row[2],
            password: row[3],
            createdAt: row[4],
          };
          
          this.users.push(user);
          // Keep track of the next ID for new users
          this.nextId = Math.max(this.nextId, (user.id || 0) + 1);
        }
      });
      
      console.log(`Loaded ${this.users.length} users from Google Sheets`);
    } catch (error) {
      console.error('Error loading users from sheet:', error);
      throw error;
    }
  }

  /**
   * Get all users 
   */
  async getAllUsers(): Promise<SheetUser[]> {
    try {
      // Make sure the sheet is initialized
      if (!this.isInitialized) {
        await this.initializeUserSheet();
      }
      
      if (!this.useMockStorage && this.sheets) {
        // Reload users from sheet to ensure data is up-to-date
        await this.loadUsersFromSheet();
      }
      
      return [...this.users]; // Return a copy of the users array
    } catch (error) {
      console.error('Error getting all users:', error);
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
      
      if (!this.useMockStorage && this.sheets) {
        // For real integration, reload users from sheet to ensure data is up-to-date
        await this.loadUsersFromSheet();
      }
      
      const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return user || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Create a new user in Google Sheets
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
      
      // Assign an ID to the new user
      const newUser: SheetUser = {
        ...user,
        id: this.nextId++
      };
      
      // Add user to Google Sheets
      if (!this.useMockStorage && this.sheets) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${this.userSheetName}!A:E`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [
              [newUser.id, newUser.name, newUser.email, newUser.password, newUser.createdAt],
            ],
          },
        });
        
        console.log(`Added user to Google Sheets: ${newUser.name} (${newUser.email})`);
      }
      
      // Add user to in-memory array too
      this.users.push(newUser);
      console.log(`Created new user: ${newUser.name} (${newUser.email})`);
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
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
      
      if (!this.useMockStorage && this.sheets) {
        // Reload users from sheet to ensure data is up-to-date
        await this.loadUsersFromSheet();
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