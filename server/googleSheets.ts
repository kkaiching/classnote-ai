import { google } from 'googleapis';

// Define the user sheet structure
interface SheetUser {
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export class GoogleSheetsService {
  private readonly auth: any;
  private readonly sheets: any;
  private readonly spreadsheetId: string;
  private readonly userSheetName = 'Users'; // Name of the sheet tab for users

  constructor() {
    // Get credentials from environment variables
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

    if (!privateKey || !clientEmail || !this.spreadsheetId) {
      throw new Error('Missing Google Sheets credentials');
    }

    // Set up authentication
    this.auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize sheets API
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Initialize the user sheet if it doesn't exist
   */
  async initializeUserSheet(): Promise<void> {
    try {
      // Check if the sheet exists
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets;
      const userSheetExists = sheets.some(
        (sheet: any) => sheet.properties.title === this.userSheetName
      );

      // If the sheet doesn't exist, create it with headers
      if (!userSheetExists) {
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

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.userSheetName}!A1:D1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['name', 'email', 'password', 'createdAt']],
          },
        });
      }
    } catch (error) {
      console.error('Error initializing user sheet:', error);
      throw error;
    }
  }

  /**
   * Get all users from the sheet
   */
  async getAllUsers(): Promise<SheetUser[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.userSheetName}!A2:D`,
      });

      const rows = response.data.values || [];
      return rows.map((row: any) => ({
        name: row[0] || '',
        email: row[1] || '',
        password: row[2] || '',
        createdAt: row[3] || '',
      }));
    } catch (error) {
      console.error('Error getting users from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<SheetUser | null> {
    try {
      const users = await this.getAllUsers();
      const user = users.find((u) => u.email === email);
      return user || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(user: SheetUser): Promise<SheetUser> {
    try {
      // Add user to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.userSheetName}!A:D`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [
            [
              user.name,
              user.email,
              user.password,
              user.createdAt,
            ],
          ],
        },
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const googleSheetsService = new GoogleSheetsService();