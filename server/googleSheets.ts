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
      console.log("開始創建使用者：", user.email);
      
      if (!this.initialized) {
        console.log("Google Sheets 尚未初始化，嘗試初始化...");
        await this.initialize();
        
        if (!this.initialized) {
          console.log("初始化失敗，無法創建使用者");
          throw new Error("Google Sheets service not initialized");
        }
      }
      
      console.log("Google Sheets 已初始化，正在獲取用戶數據...");
      
      // Get the current row count to determine the ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:A'
      });
      
      const rows = response.data.values || [];
      console.log("現有行數:", rows.length);
      
      // 如果沒有標題行，先添加一個
      let id = rows.length;
      if (rows.length === 0) {
        console.log("添加標題行...");
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'users!A:E',
          valueInputOption: 'RAW',
          requestBody: {
            values: [USER_HEADERS]
          }
        });
        id = 1; // 標題行後的第一行
      } else {
        // 如果有數據，使用實際的行數（包括標題行）
        id = rows.length;
      }
      
      const createdAt = new Date();
      console.log("創建ID:", id, "創建時間:", createdAt);
      
      // Create the user object
      const newUser: User = {
        ...user,
        id,
        createdAt
      };
      
      console.log("正在將用戶添加到試算表...");
      
      // Add the user to the sheet
      const appendResponse = await this.sheets.spreadsheets.values.append({
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
      
      console.log("用戶添加成功:", appendResponse.data.updates);
      return newUser;
    } catch (error) {
      console.error("創建用戶時出錯:", error);
      if (error.response) {
        console.error("API 錯誤響應:", error.response.data);
      }
      throw error;
    }
  }

  /**
   * Check if the Google Sheets integration is available
   * Also reinitialize if needed
   */
  isAvailable(): boolean {
    // If we're not initialized, try to initialize
    if (!this.initialized) {
      this.initialize().catch(err => {
        console.error("Failed to initialize Google Sheets on availability check:", err);
      });
    }
    return this.initialized;
  }
  
  /**
   * Bulk import existing users to Google Sheets
   * This is helpful for migrating existing local users to Google Sheets
   */
  async bulkImportUsers(users: User[]): Promise<boolean> {
    try {
      console.log(`開始批量導入 ${users.length} 個用戶到 Google Sheets...`);
      
      if (!this.initialized) {
        console.log("Google Sheets 尚未初始化，嘗試初始化...");
        await this.initialize();
        
        if (!this.initialized) {
          console.log("初始化失敗，無法匯入用戶");
          return false;
        }
      }
      
      // Get current users to avoid duplicates
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:E'
      });
      
      const rows = response.data.values || [];
      console.log(`現有 ${rows.length - 1} 筆用戶資料在 Google Sheets`);
      
      // Extract existing emails to avoid duplicates
      const existingEmails = new Set<string>();
      if (rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][2]) {
            existingEmails.add(rows[i][2]); // Email is at index 2
          }
        }
      }
      
      console.log("現有郵箱列表:", Array.from(existingEmails));
      
      // Prepare users for import, excluding any that already exist
      const usersToImport = users.filter(user => !existingEmails.has(user.email));
      
      if (usersToImport.length === 0) {
        console.log("沒有新用戶需要匯入");
        return true;
      }
      
      console.log(`將匯入 ${usersToImport.length} 個用戶...`);
      
      // Prepare values for batch import
      const values = usersToImport.map(user => {
        // 確保創建時間是有效的日期對象
        let createdAtStr;
        if (user.createdAt instanceof Date) {
          createdAtStr = user.createdAt.toISOString();
        } else if (typeof user.createdAt === 'string') {
          createdAtStr = user.createdAt;
        } else {
          // 如果 createdAt 無效或不存在，使用當前時間
          createdAtStr = new Date().toISOString();
        }
        
        return [
          user.id.toString(),
          user.name,
          user.email,
          user.password,
          createdAtStr
        ];
      });
      
      // Import all users in one batch
      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'users!A:E',
        valueInputOption: 'RAW',
        requestBody: { values }
      });
      
      console.log(`成功匯入 ${values.length} 個用戶: `, 
        appendResponse.data.updates?.updatedRows || 0, '行更新');
      
      return true;
    } catch (error) {
      console.error("匯入用戶時出錯:", error);
      if (error.response) {
        console.error("API 錯誤響應:", error.response.data);
      }
      return false;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();