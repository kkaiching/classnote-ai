import { User, InsertUser } from '@shared/schema';
import { IStorage } from './storage';
import { googleSheetsService } from './googleSheets';

// Google Sheets 儲存適配器
export async function createSheetsAdapter(): Promise<Partial<IStorage>> {
  // 測試 Google Sheets 連接
  const isAvailable = await testGoogleSheetsConnection();
  if (!isAvailable) {
    console.log('Google Sheets 連接失敗，將使用內存儲存');
    return {};
  }

  // 確保使用者表格存在
  await ensureUserSheetExists();

  // 返回使用者相關功能的實現
  return {
    getUserByEmail,
    getUserByUsername,
    createUser,
    getUser,
  };
}

// 測試 Google Sheets 連接
async function testGoogleSheetsConnection(): Promise<boolean> {
  return googleSheetsService.isAvailable();
}

// 確保使用者表格存在
async function ensureUserSheetExists(): Promise<void> {
  await googleSheetsService.initializeUserSheet();
}

// 獲取 Google Sheets 客戶端
async function getGoogleSheetsClient() {
  return googleSheetsService;
}

// 獲取所有使用者
async function getAllUsers(): Promise<User[]> {
  return googleSheetsService.getAllUsers();
}

// 通過電子郵件獲取使用者
async function getUserByEmail(email: string): Promise<User | undefined> {
  return googleSheetsService.getUserByEmail(email);
}

// 通過使用者名稱獲取使用者（相容性方法，直接使用email）
async function getUserByUsername(username: string): Promise<User | undefined> {
  return googleSheetsService.getUserByEmail(username);
}

// 通過ID獲取使用者
async function getUser(id: number): Promise<User | undefined> {
  return googleSheetsService.getUser(id);
}

// 創建使用者
async function createUser(userData: InsertUser): Promise<User> {
  return googleSheetsService.createUser(userData);
}