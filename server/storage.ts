import { recordings, transcripts, notes, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Note, type InsertNote, users, type User, type InsertUser } from "@shared/schema";
import { googleSheetsService } from "./googleSheets";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Recording methods
  createRecording(recording: InsertRecording): Promise<Recording>;
  getRecording(id: number): Promise<Recording | undefined>;
  getAllRecordings(): Promise<Recording[]>;
  updateRecordingStatus(id: number, status: string): Promise<Recording | undefined>;
  updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined>;
  updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined>;
  updateRecordingTitle(id: number, title: string): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<boolean>;

  // Transcript methods
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined>;

  // Note methods
  createNote(note: InsertNote): Promise<Note>;
  getNoteByRecordingId(recordingId: number): Promise<Note | undefined>;
  updateNote(id: number, content: string): Promise<Note | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recordings: Map<number, Recording>;
  private transcripts: Map<number, Transcript>;
  private notes: Map<number, Note>;
  private userCurrentId: number;
  private recordingCurrentId: number;
  private transcriptCurrentId: number;
  private noteCurrentId: number;

  constructor() {
    this.users = new Map();
    this.recordings = new Map();
    this.transcripts = new Map();
    this.notes = new Map();
    this.userCurrentId = 1;
    this.recordingCurrentId = 1;
    this.transcriptCurrentId = 1;
    this.noteCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Keep for backward compatibility
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  // Recording methods
  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.recordingCurrentId++;
    const createdAt = new Date();
    const recording: Recording = { 
      ...insertRecording, 
      id, 
      createdAt,
      transcribed: insertRecording.transcribed || false,
      notesGenerated: insertRecording.notesGenerated || false,
      duration: insertRecording.duration || null
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return Array.from(this.recordings.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, status };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, transcribed };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, notesGenerated };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }
  
  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, title };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async deleteRecording(id: number): Promise<boolean> {
    // 檢查錄音是否存在
    const recording = this.recordings.get(id);
    if (!recording) return false;
    
    // 刪除相關資源 (transcript 和 note)
    const transcript = Array.from(this.transcripts.values()).find(t => t.recordingId === id);
    if (transcript) {
      this.transcripts.delete(transcript.id);
    }
    
    const note = Array.from(this.notes.values()).find(n => n.recordingId === id);
    if (note) {
      this.notes.delete(note.id);
    }
    
    // 刪除錄音
    return this.recordings.delete(id);
  }

  // Transcript methods
  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = this.transcriptCurrentId++;
    const createdAt = new Date();
    const transcript: Transcript = { ...insertTranscript, id, createdAt };
    this.transcripts.set(id, transcript);
    return transcript;
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return Array.from(this.transcripts.values()).find(
      (transcript) => transcript.recordingId === recordingId,
    );
  }

  // Note methods
  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteCurrentId++;
    const createdAt = new Date();
    const note: Note = { ...insertNote, id, createdAt };
    this.notes.set(id, note);
    return note;
  }

  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    return Array.from(this.notes.values()).find(
      (note) => note.recordingId === recordingId,
    );
  }

  async updateNote(id: number, content: string): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    const updatedNote = { ...note, content };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }
}

export class GoogleSheetsStorage implements IStorage {
  // User methods that will use Google Sheets
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Since Google Sheets doesn't have easy querying by ID, we'll get all users and filter
      const allUsers = await googleSheetsService.getAllUsers();
      // This is inefficient with many users but works for our MVP
      // We'll need to convert string ID to number to match
      return allUsers.find(u => u.id?.toString() === id.toString());
    } catch (error) {
      console.error("Error fetching user from Google Sheets:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // For backward compatibility
    return this.getUserByEmail(username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await googleSheetsService.getUserByEmail(email);
      if (!user) return undefined;
      
      // Convert to User type
      return {
        id: 0, // We don't have IDs in the Google Sheet
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: new Date(user.createdAt)
      };
    } catch (error) {
      console.error("Error fetching user by email from Google Sheets:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const newUser = {
        name: insertUser.name,
        email: insertUser.email,
        password: insertUser.password,
        createdAt: new Date().toISOString()
      };
      
      await googleSheetsService.createUser(newUser);
      
      // Return as User type
      return {
        id: 0, // We don't have IDs in the Google Sheet
        ...insertUser,
        createdAt: new Date()
      };
    } catch (error) {
      console.error("Error creating user in Google Sheets:", error);
      throw error;
    }
  }

  // For the Recording, Transcript, and Note methods, we'll use the MemStorage implementation

  // Recording methods
  private memStorage = new MemStorage();

  async createRecording(recording: InsertRecording): Promise<Recording> {
    return this.memStorage.createRecording(recording);
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.memStorage.getRecording(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return this.memStorage.getAllRecordings();
  }

  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingStatus(id, status);
  }

  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingTranscribed(id, transcribed);
  }

  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingNotesGenerated(id, notesGenerated);
  }

  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingTitle(id, title);
  }

  async deleteRecording(id: number): Promise<boolean> {
    return this.memStorage.deleteRecording(id);
  }

  // Transcript methods
  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    return this.memStorage.createTranscript(transcript);
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return this.memStorage.getTranscriptByRecordingId(recordingId);
  }

  // Note methods
  async createNote(note: InsertNote): Promise<Note> {
    return this.memStorage.createNote(note);
  }

  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    return this.memStorage.getNoteByRecordingId(recordingId);
  }

  async updateNote(id: number, content: string): Promise<Note | undefined> {
    return this.memStorage.updateNote(id, content);
  }
}

// Initialize Google Sheets
async function initializeGoogleSheets() {
  try {
    await googleSheetsService.initializeUserSheet();
    console.log("Google Sheets initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Google Sheets:", error);
    console.log("Falling back to in-memory storage");
    return false;
  }
}

// Creating a hybrid storage with Google Sheets for users and in-memory for other data
export class HybridStorage implements IStorage {
  private sheetsStorage: GoogleSheetsStorage;
  private memStorage: MemStorage;

  constructor() {
    this.sheetsStorage = new GoogleSheetsStorage();
    this.memStorage = new MemStorage();
  }

  // User methods - use Google Sheets
  async getUser(id: number): Promise<User | undefined> {
    return this.sheetsStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.sheetsStorage.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.sheetsStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.sheetsStorage.createUser(user);
  }

  // All other methods - use in-memory storage
  async createRecording(recording: InsertRecording): Promise<Recording> {
    return this.memStorage.createRecording(recording);
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.memStorage.getRecording(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return this.memStorage.getAllRecordings();
  }

  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingStatus(id, status);
  }

  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingTranscribed(id, transcribed);
  }

  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingNotesGenerated(id, notesGenerated);
  }

  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    return this.memStorage.updateRecordingTitle(id, title);
  }

  async deleteRecording(id: number): Promise<boolean> {
    return this.memStorage.deleteRecording(id);
  }

  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    return this.memStorage.createTranscript(transcript);
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return this.memStorage.getTranscriptByRecordingId(recordingId);
  }

  async createNote(note: InsertNote): Promise<Note> {
    return this.memStorage.createNote(note);
  }

  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    return this.memStorage.getNoteByRecordingId(recordingId);
  }

  async updateNote(id: number, content: string): Promise<Note | undefined> {
    return this.memStorage.updateNote(id, content);
  }
}

// Export the hybrid storage implementation
export const storage = new HybridStorage();
