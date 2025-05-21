import { recordings, transcripts, notes, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Note, type InsertNote, users, type User, type InsertUser } from "@shared/schema";
import { googleSheetsService } from "./googleSheets";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORAGE_FILE = path.join(__dirname, '..', 'local_storage.json');

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

// Hybrid storage that tries Google Sheets first, then falls back to in-memory
export class HybridStorage implements IStorage {
  private localStorage: MemStorage;
  private useGoogleSheets: boolean;

  constructor() {
    this.localStorage = new MemStorage();
    
    // Load data from local file initially
    this.loadFromFile();
    
    // Check if Google Sheets integration is available
    this.useGoogleSheets = googleSheetsService.isAvailable();
    
    // Schedule a check after a brief delay to see if Google Sheets becomes available
    setTimeout(() => {
      this.checkGoogleSheetsAvailability();
    }, 3000);
  }
  
  private async checkGoogleSheetsAvailability() {
    try {
      this.useGoogleSheets = googleSheetsService.isAvailable();
      if (this.useGoogleSheets) {
        console.log("Google Sheets 連接已建立，將用於用戶資料儲存");
      } else {
        console.log("Google Sheets 不可用，僅使用本地檔案儲存");
      }
    } catch (error) {
      console.error("檢查 Google Sheets 可用性時出錯:", error);
      this.useGoogleSheets = false;
    }
  }

  private saveToFile() {
    try {
      const data = {
        users: Array.from(this.localStorage.users.entries()),
        recordings: Array.from(this.localStorage.recordings.entries()),
        transcripts: Array.from(this.localStorage.transcripts.entries()),
        notes: Array.from(this.localStorage.notes.entries()),
        userCurrentId: this.localStorage.userCurrentId,
        recordingCurrentId: this.localStorage.recordingCurrentId,
        transcriptCurrentId: this.localStorage.transcriptCurrentId,
        noteCurrentId: this.localStorage.noteCurrentId
      };
      
      fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving data to file:", error);
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(LOCAL_STORAGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(LOCAL_STORAGE_FILE, 'utf8'));
        
        this.localStorage.users = new Map(data.users);
        this.localStorage.recordings = new Map(data.recordings);
        this.localStorage.transcripts = new Map(data.transcripts);
        this.localStorage.notes = new Map(data.notes);
        this.localStorage.userCurrentId = data.userCurrentId;
        this.localStorage.recordingCurrentId = data.recordingCurrentId;
        this.localStorage.transcriptCurrentId = data.transcriptCurrentId;
        this.localStorage.noteCurrentId = data.noteCurrentId;
        
        console.log(`Loaded ${this.localStorage.users.size} users from local storage`);
      }
    } catch (error) {
      console.error("Error loading data from file:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.localStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.localStorage.getUserByUsername(username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (this.useGoogleSheets) {
      // Try Google Sheets first
      const user = await googleSheetsService.getUserByEmail(email);
      if (user) {
        return user;
      }
    }
    
    // Fall back to local storage
    return this.localStorage.getUserByEmail(email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (this.useGoogleSheets) {
      try {
        // Try Google Sheets first
        const user = await googleSheetsService.createUser(insertUser);
        
        // Also store in local storage for consistency
        await this.localStorage.createUser({
          ...insertUser,
          id: user.id
        });
        
        return user;
      } catch (error) {
        console.error("Error creating user in Google Sheets, falling back to local storage:", error);
      }
    }
    
    // Fall back to local storage
    const user = await this.localStorage.createUser(insertUser);
    this.saveToFile();
    return user;
  }
  
  // Recording methods
  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const recording = await this.localStorage.createRecording(insertRecording);
    this.saveToFile();
    return recording;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.localStorage.getRecording(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return this.localStorage.getAllRecordings();
  }

  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    const recording = await this.localStorage.updateRecordingStatus(id, status);
    this.saveToFile();
    return recording;
  }

  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    const recording = await this.localStorage.updateRecordingTranscribed(id, transcribed);
    this.saveToFile();
    return recording;
  }

  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    const recording = await this.localStorage.updateRecordingNotesGenerated(id, notesGenerated);
    this.saveToFile();
    return recording;
  }
  
  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    const recording = await this.localStorage.updateRecordingTitle(id, title);
    this.saveToFile();
    return recording;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const result = await this.localStorage.deleteRecording(id);
    this.saveToFile();
    return result;
  }

  // Transcript methods
  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    const newTranscript = await this.localStorage.createTranscript(transcript);
    this.saveToFile();
    return newTranscript;
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return this.localStorage.getTranscriptByRecordingId(recordingId);
  }

  // Note methods
  async createNote(note: InsertNote): Promise<Note> {
    const newNote = await this.localStorage.createNote(note);
    this.saveToFile();
    return newNote;
  }

  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    return this.localStorage.getNoteByRecordingId(recordingId);
  }

  async updateNote(id: number, content: string): Promise<Note | undefined> {
    const note = await this.localStorage.updateNote(id, content);
    this.saveToFile();
    return note;
  }
}

export class MemStorage {
  users: Map<number, User>;
  recordings: Map<number, Recording>;
  transcripts: Map<number, Transcript>;
  notes: Map<number, Note>;
  userCurrentId: number;
  recordingCurrentId: number;
  transcriptCurrentId: number;
  noteCurrentId: number;

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
    const id = insertUser.id || this.userCurrentId++;
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

// Using the hybrid storage implementation that supports both Google Sheets and local storage
export const storage = new HybridStorage();
