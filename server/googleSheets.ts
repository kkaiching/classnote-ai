import { google, sheets_v4 } from 'googleapis';
import type { User, InsertUser } from '@shared/schema';

// Define headers for the users sheet
const USER_HEADERS = ['id', 'name', 'email', 'password', 'createdAt'];

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private serviceAccountKey: any;
  private initialized: boolean = false;
  private serviceAccountEmail: string = '';

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
    
    try {
      // Parse the service account key from environment variable
      if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        this.serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        this.serviceAccountEmail = this.serviceAccountKey.client_email;
        console.log("Initializing Google Sheets service with client email:", this.serviceAccountEmail);
      } else {
        throw new Error("GOOGLE_SERVICE_ACCOUNT environment variable is not set");
      }

      // Initialize the Google Sheets API client
      this.initialize();
    } catch (error) {
      console.error("Error initializing Google Sheets service:", error);
    }
  }

  /**
   * Initialize the Google Sheets API client
   */
  private async initialize() {
    try {
      console.log("Initializing Google Sheets...");
      
      // Create a JWT client using the service account credentials
      const auth = new google.auth.JWT({
        email: this.serviceAccountKey.client_email,
        key: this.serviceAccountKey.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Create the Google Sheets client
      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Verify the sheets can be accessed
      const connectionSuccess = await this.testConnection();
      
      if (!connectionSuccess) {
        console.log("Google Sheets 不可用，請確保已分享試算表給服務帳戶:", this.serviceAccountEmail);
        return;
      }
      
      // Initialize the sheets if they don't exist
      await this.ensureSheetsExist();
      
      this.initialized = true;
      console.log("Google Sheets service initialized successfully");
    } catch (error) {
      console.error("Error initializing Google Sheets:", error);
      this.initialized = false;
    }
  }

  /**
   * Test the connection to Google Sheets
   */
  private async testConnection() {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      console.log("Google Sheets service initialized successfully");
      return true;
    } catch (error) {
      if (error.code === 403) {
        console.error(`Google Sheets 連接測試失敗: 權限不足 (請確保已分享試算表給 ${this.serviceAccountEmail})`);
      } else {
        console.error("Google Sheets 連接測試失敗:", error);
      }
      return false;
    }
  }

  /**
   * Ensure the required sheets exist, create them if they don't
   */
  private async ensureSheetsExist() {
    try {
      // Get the spreadsheet information
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      // Check if the users sheet exists
      const sheets = response.data.sheets || [];
      let usersSheetExists = false;
      
      for (const sheet of sheets) {
        if (sheet.properties?.title === 'users') {
          usersSheetExists = true;
          break;
        }
      }
      
      // Create the users sheet if it doesn't exist
      if (!usersSheetExists) {
        await this.createUsersSheet();
      }
    } catch (error) {
      console.error("Error ensuring sheets exist:", error);
      throw error;
    }
  }

  /**
   * Create the users sheet and add headers
   */
  private async createUsersSheet() {
    try {
      // Add a new sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'users'
                }
              }
            }
          ]
        }
      });
      
      // Add headers to the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A1:E1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [USER_HEADERS]
        }
      });
      
      console.log("Users sheet created successfully");
    } catch (error) {
      console.error("Error creating users sheet:", error);
      throw error;
    }
  }

  /**
   * Find a user by email
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get all users
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:E'
      });
      
      const rows = response.data.values || [];
      
      // Skip the header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Check if the email matches
        if (row[2] === email) {
          return {
            id: parseInt(row[0]),
            name: row[1],
            email: row[2],
            password: row[3],
            createdAt: new Date(row[4])
          };
        }
      }
      
      // User not found
      return undefined;
    } catch (error) {
      console.error("Error finding user by email:", error);
      return undefined;
    }
  }

  /**
   * Create a new user
   */
  async createUser(user: InsertUser): Promise<User> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get the current row count to determine the ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:A'
      });
      
      const rows = response.data.values || [];
      const id = rows.length; // Use the row count as the ID
      const createdAt = new Date();
      
      // Create the user object
      const newUser: User = {
        ...user,
        id,
        createdAt
      };
      
      // Add the user to the sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              id.toString(),
              user.name,
              user.email,
              user.password,
              createdAt.toISOString()
            ]
          ]
        }
      });
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Check if the Google Sheets integration is available
   */
  isAvailable(): boolean {
    return this.initialized;
  }
}

export const googleSheetsService = new GoogleSheetsService();