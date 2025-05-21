import { google } from 'googleapis';
import { User, InsertUser } from '../shared/schema';

// Create Google Auth client
const getAuthClient = () => {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
};

// Setup the sheets API
const getSheetsAPI = async () => {
  try {
    const authClient = getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Error creating Google Sheets client:', error);
    throw error;
  }
};

// Check if the Users sheet exists, create if it doesn't
export const initializeUserSheet = async (): Promise<boolean> => {
  try {
    const sheetsAPI = await getSheetsAPI();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Get spreadsheet information
    const res = await sheetsAPI.spreadsheets.get({ spreadsheetId });
    
    // Check if Users sheet exists
    const userSheetExists = res.data.sheets?.some(
      sheet => sheet.properties?.title === 'Users'
    );
    
    // If it doesn't exist, create it
    if (!userSheetExists) {
      await sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Users' }
            }
          }]
        }
      });
      
      // Add headers
      await sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range: 'Users!A1:E1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'name', 'email', 'password', 'createdAt']]
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing User sheet:', error);
    throw error;
  }
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const sheetsAPI = await getSheetsAPI();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Get all rows
    const res = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A2:E'  // Skip header row
    });
    
    const rows = res.data.values || [];
    
    // Convert rows to User objects
    return rows.map(row => ({
      id: parseInt(row[0]),
      name: row[1],
      email: row[2],
      password: row[3],
      createdAt: new Date(row[4])
    }));
  } catch (error) {
    console.error('Error getting users from Google Sheets:', error);
    return [];
  }
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  } catch (error) {
    console.error('Error getting user by email:', error);
    return undefined;
  }
};

// Create a new user
export const createUser = async (userData: InsertUser): Promise<User> => {
  try {
    const sheetsAPI = await getSheetsAPI();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Get all existing users
    const users = await getAllUsers();
    
    // Generate a new ID
    const newId = users.length > 0 
      ? Math.max(...users.map(user => user.id)) + 1 
      : 1;
    
    const createdAt = new Date();
    
    // Create user object
    const newUser: User = {
      id: newId,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt
    };
    
    // Append row to sheet
    await sheetsAPI.spreadsheets.values.append({
      spreadsheetId,
      range: 'Users!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.password,
          newUser.createdAt.toISOString()
        ]]
      }
    });
    
    return newUser;
  } catch (error) {
    console.error('Error creating user in Google Sheets:', error);
    throw new Error('Failed to create user in Google Sheets');
  }
};

// Get user by ID
export const getUser = async (id: number): Promise<User | undefined> => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.id === id);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return undefined;
  }
};

// Check if Google Sheets is available
export const isGoogleSheetsAvailable = async (): Promise<boolean> => {
  try {
    const sheetsAPI = await getSheetsAPI();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Try to access the spreadsheet
    await sheetsAPI.spreadsheets.get({ spreadsheetId });
    return true;
  } catch (error) {
    console.error('Google Sheets not available:', error);
    return false;
  }
};