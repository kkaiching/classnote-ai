import { User, InsertUser } from '@shared/schema';
import { localUserStore } from './localUserStore';
import * as directSheetsService from './directSheetsService';

/**
 * 綜合用戶儲存服務 - 同時支持本地檔案儲存和 Google Sheets 儲存
 */
export class UserStorage {
  private useGoogleSheets: boolean = false;
  
  constructor() {
    // 在建構函數中檢查 Google Sheets 是否可用
    this.checkGoogleSheetsAvailability().catch(err => {
      console.error('檢查 Google Sheets 可用性時出錯:', err);
    });
  }
  
  /**
   * 檢查 Google Sheets 是否可用
   */
  private async checkGoogleSheetsAvailability(): Promise<void> {
    try {
      this.useGoogleSheets = await directSheetsService.isGoogleSheetsAvailable();
      if (this.useGoogleSheets) {
        console.log('Google Sheets 可用，將同步儲存使用者資料');
        await directSheetsService.initializeUserSheet();
      } else {
        console.log('Google Sheets 不可用，僅使用本地檔案儲存');
      }
    } catch (error) {
      console.error('檢查 Google Sheets 可用性時出錯:', error);
      this.useGoogleSheets = false;
    }
  }
  
  /**
   * 創建使用者 - 同時儲存到本地檔案和 Google Sheets (如可用)
   */
  async createUser(userData: InsertUser): Promise<User> {
    // 首先確保使用者保存到本地檔案
    const newUser = await localUserStore.createUser(userData);
    
    // 如果 Google Sheets 可用，嘗試同步到 Google Sheets
    if (this.useGoogleSheets) {
      try {
        await directSheetsService.createUser(userData);
        console.log(`使用者 ${userData.name} (${userData.email}) 已同步到 Google Sheets`);
      } catch (error) {
        console.error('無法將使用者同步到 Google Sheets:', error);
        // 但使用者已經保存到了本地檔案，所以不影響核心功能
      }
    }
    
    return newUser;
  }
  
  /**
   * 根據電子郵件獲取使用者
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    // 優先嘗試從本地檔案獲取
    const localUser = await localUserStore.getUserByEmail(email);
    if (localUser) return localUser;
    
    // 如果本地沒有找到，且 Google Sheets 可用，嘗試從 Google Sheets 獲取
    if (this.useGoogleSheets) {
      try {
        const sheetsUser = await directSheetsService.getUserByEmail(email);
        if (sheetsUser) {
          // 如果從 Google Sheets 找到了，同步回本地檔案
          try {
            await localUserStore.createUser({
              name: sheetsUser.name,
              email: sheetsUser.email,
              password: sheetsUser.password
            });
            console.log(`從 Google Sheets 同步使用者 ${sheetsUser.email} 到本地儲存`);
          } catch (err) {
            console.error('無法將 Google Sheets 使用者同步到本地:', err);
          }
          return sheetsUser;
        }
      } catch (error) {
        console.error('從 Google Sheets 獲取使用者失敗:', error);
      }
    }
    
    return undefined;
  }
  
  /**
   * 根據ID獲取使用者
   */
  async getUser(id: number): Promise<User | undefined> {
    // 優先從本地檔案獲取
    const localUser = await localUserStore.getUser(id);
    if (localUser) return localUser;
    
    // 如果本地沒有找到，且 Google Sheets 可用，嘗試從 Google Sheets 獲取
    if (this.useGoogleSheets) {
      try {
        return await directSheetsService.getUser(id);
      } catch (error) {
        console.error('從 Google Sheets 獲取使用者失敗:', error);
      }
    }
    
    return undefined;
  }
  
  /**
   * 根據使用者名稱獲取使用者
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    // 這裡使用 email 作為使用者名稱
    return this.getUserByEmail(username);
  }
}

// 建立單例實例
export const userStorage = new UserStorage();