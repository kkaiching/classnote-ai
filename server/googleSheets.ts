import { google } from 'googleapis';
import path from 'path';
import { User, InsertUser } from '../shared/schema';

// Google Sheets API setup
interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheets: {
    users: string;  // Sheet name for users
  };
}

export const sheetsConfig: GoogleSheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
  sheets: {
    users: 'Users'  // Default sheet name for users
  }
};

// Initialize Google Sheets API client
export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      // Add required JWT fields
      type: "service_account",
      project_id: "audio-transcription-note"
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// User management methods using Google Sheets
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get all users from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetsConfig.sheets.users}!A2:E`,  // Assuming headers are in row 1
    });
    
    const rows = response.data.values || [];
    
    // Find user with matching email
    const userRow = rows.find(row => row[1]?.toLowerCase() === email.toLowerCase());
    
    if (!userRow) return undefined;
    
    // Map row to User object
    return {
      id: parseInt(userRow[0]) || 0,
      name: userRow[1] || '',
      email: userRow[2] || '',
      password: userRow[3] || '',
      createdAt: new Date(userRow[4] || new Date())
    };
  } catch (error) {
    console.error('Error fetching user from Google Sheets:', error);
    return undefined;
  }
}

export async function createUser(user: InsertUser): Promise<User> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get the current highest ID to generate a new one
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetsConfig.sheets.users}!A2:A`,
    });
    
    const rows = response.data.values || [];
    const ids = rows.map(row => parseInt(row[0]) || 0);
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    const createdAt = new Date();
    
    // Append new user row
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetsConfig.sheets.users}!A2:E2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [newId, user.name, user.email, user.password, createdAt.toISOString()]
        ]
      }
    });
    
    // Return the created user with ID
    return {
      id: newId,
      name: user.name,
      email: user.email,
      password: user.password,
      createdAt
    };
  } catch (error) {
    console.error('Error creating user in Google Sheets:', error);
    throw new Error('Failed to create user in Google Sheets');
  }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return !!user;
}

// Initialize the Google Sheets for users if needed
export async function initializeUserSheet(): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Check if the sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetsConfig.spreadsheetId
    });
    
    const userSheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === sheetsConfig.sheets.users
    );
    
    // If the sheet doesn't exist, create it and add headers
    if (!userSheetExists) {
      // Add a new sheet
      await sheets.spreadsheets.batchUpdate({
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
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `${sheetsConfig.sheets.users}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'name', 'email', 'password', 'createdAt']]
        }
      });
    }
  } catch (error) {
    console.error('Error initializing user sheet:', error);
    throw new Error('Failed to initialize user sheet');
  }
}