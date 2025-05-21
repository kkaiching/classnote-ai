import { google } from 'googleapis';
import { User, InsertUser } from '@shared/schema';

// 表格 ID 和頁面名稱
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1Oyrcnju-Fe7WClPvw-Up97b_gVcxC6utqMaeAPk54UA';
const SHEET_NAME = 'Users';

// 建立 Google API 用戶端
const createClient = async () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
};

// 初始化表格
export const initializeUserSheet = async (): Promise<boolean> => {
  try {
    console.log('正在初始化 Google Sheets...');
    const sheets = await createClient();

    // 檢查表格是否存在
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });

    // 檢查是否有 Users 分頁
    const userSheetExists = response.data.sheets?.some(
      sheet => sheet.properties?.title === SHEET_NAME
    );

    if (!userSheetExists) {
      // 創建 Users 分頁
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME
                }
              }
            }
          ]
        }
      });

      // 設置表頭
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'name', 'email', 'password', 'createdAt']]
        }
      });
    }

    console.log('Google Sheets 初始化成功');
    return true;
  } catch (error) {
    console.error('初始化 Google Sheets 失敗:', error);
    return false;
  }
};

// 獲取所有使用者
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const sheets = await createClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E1000` // 從第二行開始獲取資料
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    return rows.map((row) => ({
      id: parseInt(row[0], 10),
      name: row[1],
      email: row[2],
      password: row[3],
      createdAt: new Date(row[4])
    }));
  } catch (error) {
    console.error('從 Google Sheets 獲取使用者失敗:', error);
    return [];
  }
};

// 根據電子郵件查詢使用者
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.email === email);
  } catch (error) {
    console.error('查詢使用者失敗:', error);
    return undefined;
  }
};

// 創建新使用者
export const createUser = async (userData: InsertUser): Promise<User> => {
  try {
    // 檢查電子郵件是否已存在
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('此電子郵件已註冊');
    }

    // 獲取所有使用者計算新ID
    const users = await getAllUsers();
    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const createdAt = new Date();

    // 連接到 Google Sheets
    const sheets = await createClient();

    // 新增使用者資料到表格
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E2`,
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

    console.log(`使用者已成功創建並寫入 Google Sheets: ${userData.name} (${userData.email})`);

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
    console.error('創建使用者失敗:', error);
    throw error;
  }
};

// 根據ID獲取使用者
export const getUser = async (id: number): Promise<User | undefined> => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.id === id);
  } catch (error) {
    console.error('根據ID查詢使用者失敗:', error);
    return undefined;
  }
};

// 檢查 Google Sheets 是否可用
export const isGoogleSheetsAvailable = async (): Promise<boolean> => {
  try {
    const sheets = await createClient();
    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    return true;
  } catch (error) {
    console.error('Google Sheets 連接測試失敗:', error);
    return false;
  }
};