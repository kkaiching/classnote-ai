import { google } from 'googleapis';
import { User, InsertUser } from '../shared/schema';
import { IStorage } from './storage';

export async function createSheetsAdapter(): Promise<Partial<IStorage>> {
  try {
    // Test the Google Sheets connection first
    await testGoogleSheetsConnection();
    
    console.log("Using Google Sheets for user authentication");
    
    // Return user-related methods using Google Sheets
    return {
      getUserByEmail,
      getUserByUsername: async (username: string) => {
        // In our implementation, username is email
        return getUserByEmail(username);
      },
      createUser,
      getUser: async (id: number) => {
        // Get all users and find by ID
        const allUsers = await getAllUsers();
        return allUsers.find(user => user.id === id);
      }
    };
  } catch (error) {
    console.error("Failed to initialize Google Sheets adapter:", error);
    return {}; // Return empty object to use default implementation
  }
}

// Test Google Sheets connection
async function testGoogleSheetsConnection() {
  try {
    const sheets = await getGoogleSheetsClient();
    const testResponse = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    if (!testResponse.data) {
      throw new Error("Could not access Google Spreadsheet");
    }
    return true;
  } catch (error) {
    console.error("Google Sheets connection test failed:", error);
    throw error;
  }
}

// Google Sheets API client
async function getGoogleSheetsClient() {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error("Error creating Google Sheets client:", error);
    throw error;
  }
}

// Get all users from Google Sheets
async function getAllUsers(): Promise<User[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get user sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Users!A2:E', // Assuming A1:E1 are headers
    });
    
    const rows = response.data.values || [];
    
    // Map rows to User objects
    return rows.map(row => ({
      id: parseInt(row[0]) || 0,
      name: row[1] || '',
      email: row[2] || '',
      password: row[3] || '',
      createdAt: new Date(row[4] || new Date())
    }));
  } catch (error) {
    console.error("Error getting users from Google Sheets:", error);
    return [];
  }
}

// Get user by email from Google Sheets
async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const users = await getAllUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  } catch (error) {
    console.error("Error getting user by email from Google Sheets:", error);
    return undefined;
  }
}

// Create a new user in Google Sheets
async function createUser(userData: InsertUser): Promise<User> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get existing users to generate next ID
    const users = await getAllUsers();
    const nextId = users.length > 0 
      ? Math.max(...users.map(user => user.id)) + 1 
      : 1;
    
    const createdAt = new Date();
    
    // Prepare new user data
    const newUser: User = {
      id: nextId,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt
    };
    
    // Check if "Users" sheet exists, create if not
    await ensureUserSheetExists();
    
    // Add the new user to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Users!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.password,
            newUser.createdAt.toISOString()
          ]
        ]
      }
    });
    
    return newUser;
  } catch (error) {
    console.error("Error creating user in Google Sheets:", error);
    throw new Error("Failed to create user in Google Sheets");
  }
}

// Ensure the User sheet exists with correct headers
async function ensureUserSheetExists() {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get all sheets in the spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID
    });
    
    // Check if Users sheet exists
    const usersSheet = spreadsheet.data.sheets?.find(
      sheet => sheet.properties?.title === 'Users'
    );
    
    if (!usersSheet) {
      // Create Users sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Users'
                }
              }
            }
          ]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'Users!A1:E1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'name', 'email', 'password', 'createdAt']]
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring Users sheet exists:", error);
    throw error;
  }
}