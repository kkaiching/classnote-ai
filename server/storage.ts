import { recordings, transcripts, notes, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Note, type InsertNote, users, type User, type InsertUser } from "@shared/schema";
import * as googleSheets from "./googleSheetsDirect";

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

// Create base memory storage
export const memStorage = new MemStorage();

// Create a hybrid storage class that will attempt to use Google Sheets for users
class HybridStorage implements IStorage {
  private useGoogleSheets: boolean = false;
  
  constructor() {
    // Initialize Google Sheets integration
    this.initializeGoogleSheets();
  }
  
  private async initializeGoogleSheets() {
    try {
      // Check if Google Sheets is available
      this.useGoogleSheets = await googleSheets.isGoogleSheetsAvailable();
      
      if (this.useGoogleSheets) {
        // Initialize the Users sheet
        await googleSheets.initializeUserSheet();
        console.log("Google Sheets initialized successfully for user authentication");
      } else {
        console.log("Google Sheets not available, using memory storage for user data");
      }
    } catch (error) {
      console.error("Error initializing Google Sheets:", error);
      this.useGoogleSheets = false;
      console.log("Falling back to memory storage for user data");
    }
  }
  
  // User methods with Google Sheets integration
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (this.useGoogleSheets) {
        return await googleSheets.getUser(id);
      }
    } catch (error) {
      console.error("Error using Google Sheets for getUser, falling back to memory storage:", error);
    }
    return memStorage.getUser(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (this.useGoogleSheets) {
        // In our implementation, username is email
        return await googleSheets.getUserByEmail(username);
      }
    } catch (error) {
      console.error("Error using Google Sheets for getUserByUsername, falling back to memory storage:", error);
    }
    return memStorage.getUserByUsername(username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (this.useGoogleSheets) {
        return await googleSheets.getUserByEmail(email);
      }
    } catch (error) {
      console.error("Error using Google Sheets for getUserByEmail, falling back to memory storage:", error);
    }
    return memStorage.getUserByEmail(email);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      if (this.useGoogleSheets) {
        const newUser = await googleSheets.createUser(user);
        // Also save to memory storage as backup
        await memStorage.createUser({...user, id: newUser.id});
        return newUser;
      }
    } catch (error) {
      console.error("Error using Google Sheets for createUser, falling back to memory storage:", error);
    }
    return memStorage.createUser(user);
  }
  
  // All other methods delegate to memory storage
  async createRecording(recording: InsertRecording): Promise<Recording> {
    return memStorage.createRecording(recording);
  }
  
  async getRecording(id: number): Promise<Recording | undefined> {
    return memStorage.getRecording(id);
  }
  
  async getAllRecordings(): Promise<Recording[]> {
    return memStorage.getAllRecordings();
  }
  
  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    return memStorage.updateRecordingStatus(id, status);
  }
  
  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    return memStorage.updateRecordingTranscribed(id, transcribed);
  }
  
  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    return memStorage.updateRecordingNotesGenerated(id, notesGenerated);
  }
  
  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    return memStorage.updateRecordingTitle(id, title);
  }
  
  async deleteRecording(id: number): Promise<boolean> {
    return memStorage.deleteRecording(id);
  }
  
  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    return memStorage.createTranscript(transcript);
  }
  
  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return memStorage.getTranscriptByRecordingId(recordingId);
  }
  
  async createNote(note: InsertNote): Promise<Note> {
    return memStorage.createNote(note);
  }
  
  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    return memStorage.getNoteByRecordingId(recordingId);
  }
  
  async updateNote(id: number, content: string): Promise<Note | undefined> {
    return memStorage.updateNote(id, content);
  }
}

// Export the hybrid storage instance
export const storage = new HybridStorage();
