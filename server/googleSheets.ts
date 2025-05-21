import { GoogleAuth } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';
import { User, InsertUser } from '@shared/schema';

interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheets: {
    users: string;  // Sheet name for users
  };
}

export const sheetsConfig: GoogleSheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
  sheets: {
    users: 'Users'  // 使用者資料表名稱
  }
};

// Google Sheets 服務類
export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private initialized: boolean = false;
  private initError: Error | null = null;

  constructor() {
    try {
      console.log('Initializing Google Sheets service with client email:', process.env.GOOGLE_CLIENT_EMAIL?.substring(0, 5) + '...');
      
      // 建立更安全的憑證處理，避免私鑰格式問題
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
        private_key: process.env.GOOGLE_PRIVATE_KEY || ''
      };
      
      // 嘗試修復私鑰格式
      if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      this.initError = error instanceof Error ? error : new Error(String(error));
      this.initialized = false;
    }
  }

  /**
   * 檢查 Google Sheets 是否可用
   */
  isAvailable(): boolean {
    return this.initialized;
  }

  /**
   * 獲取初始化錯誤（如果有）
   */
  getInitError(): Error | null {
    return this.initError;
  }

  /**
   * 初始化 Users 表格
   */
  async initializeUserSheet(): Promise<boolean> {
    if (!this.initialized) {
      console.log('Google Sheets service not initialized');
      return false;
    }

    try {
      // 檢查表格是否存在
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetsConfig.spreadsheetId
      });

      // 檢查是否有 Users 分頁
      const userSheetExists = response.data.sheets?.some(
        sheet => sheet.properties?.title === sheetsConfig.sheets.users
      );

      if (!userSheetExists) {
        // 創建 Users 分頁
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetsConfig.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetsConfig.sheets.users
                  }
                }
              }
            ]
          }
        });

        // 設置表頭
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: sheetsConfig.spreadsheetId,
          range: `${sheetsConfig.sheets.users}!A1:D1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['id', 'name', 'email', 'password', 'createdAt']]
          }
        });
      }

      console.log('Google Sheets successfully initialized for user storage');
      return true;
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      return false;
    }
  }

  /**
   * 獲取所有使用者資料
   */
  async getAllUsers(): Promise<User[]> {
    if (!this.initialized) {
      return [];
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `${sheetsConfig.sheets.users}!A2:E1000` // 從第二行開始獲取資料
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        id: parseInt(row[0], 10),
        name: row[1],
        email: row[2],
        password: row[3],
        createdAt: new Date(row[4])
      }));
    } catch (error) {
      console.error('Error fetching users from Google Sheets:', error);
      return [];
    }
  }

  /**
   * 根據電子郵件查詢使用者
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.initialized) {
      return undefined;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `${sheetsConfig.sheets.users}!A2:E1000`
      });

      const rows = response.data.values || [];
      const userRow = rows.find(row => row[2] === email);

      if (!userRow) {
        return undefined;
      }

      return {
        id: parseInt(userRow[0], 10),
        name: userRow[1],
        email: userRow[2],
        password: userRow[3],
        createdAt: new Date(userRow[4])
      };
    } catch (error) {
      console.error('Error fetching user by email from Google Sheets:', error);
      return undefined;
    }
  }

  /**
   * 檢查電子郵件是否已存在
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return !!user;
  }

  /**
   * 創建新使用者
   */
  async createUser(userData: InsertUser): Promise<User> {
    if (!this.initialized) {
      throw new Error('Google Sheets service not initialized');
    }

    // 檢查電子郵件是否已存在
    const emailExists = await this.checkEmailExists(userData.email);
    if (emailExists) {
      throw new Error('此電子郵件已註冊');
    }

    try {
      // 獲取所有使用者計算新ID
      const users = await this.getAllUsers();
      const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const createdAt = new Date();

      // 新增使用者資料到表格
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `${sheetsConfig.sheets.users}!A2:E2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              nextId.toString(),
              userData.name,
              userData.email,
              userData.password,
              createdAt.toISOString()
            ]
          ]
        }
      });

      console.log(`User created in Google Sheets: ${userData.name} (${userData.email})`);

      // 返回創建後的使用者資料
      const newUser: User = {
        id: nextId,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        createdAt
      };

      return newUser;
    } catch (error) {
      console.error('Error creating user in Google Sheets:', error);
      throw error;
    }
  }

  /**
   * 根據ID獲取使用者
   */
  async getUser(id: number): Promise<User | undefined> {
    if (!this.initialized) {
      return undefined;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `${sheetsConfig.sheets.users}!A2:E1000`
      });

      const rows = response.data.values || [];
      const userRow = rows.find(row => parseInt(row[0], 10) === id);

      if (!userRow) {
        return undefined;
      }

      return {
        id: parseInt(userRow[0], 10),
        name: userRow[1],
        email: userRow[2],
        password: userRow[3],
        createdAt: new Date(userRow[4])
      };
    } catch (error) {
      console.error('Error fetching user by id from Google Sheets:', error);
      return undefined;
    }
  }
}

// 創建服務實例
export const googleSheetsService = new GoogleSheetsService();

// 啟動時初始化
export async function initializeGoogleSheets() {
  console.log('Initializing Google Sheets...');
  if (googleSheetsService.isAvailable()) {
    await googleSheetsService.initializeUserSheet();
    console.log('Google Sheets service initialized successfully');
  } else {
    console.error('Google Sheets service initialization failed:', googleSheetsService.getInitError());
    console.log('Falling back to in-memory storage for users');
  }
}