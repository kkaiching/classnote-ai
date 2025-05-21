import { recordings, transcripts, notes, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Note, type InsertNote, users, type User, type InsertUser } from "@shared/schema";
import { localUserStore } from "./localUserStore";

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

export const memStorage = new MemStorage();

// 增強版儲存層 - 支持 Google Sheets
class EnhancedStorage implements IStorage {
  private initialized: boolean = false;

  constructor() {
    this.init().catch(err => {
      console.error('Error initializing EnhancedStorage:', err);
    });
  }

  private async init() {
    try {
      // 導入用戶儲存模組
      const { userStorage } = await import('./userStorage');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize enhanced storage:', error);
      this.initialized = true;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    // 導入用戶儲存服務
    const { userStorage } = await import('./userStorage');
    try {
      return await userStorage.getUser(id);
    } catch (error) {
      console.error('Error getting user:', error);
      return memStorage.getUser(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // 導入用戶儲存服務
    const { userStorage } = await import('./userStorage');
    try {
      return await userStorage.getUserByUsername(username);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return memStorage.getUserByUsername(username);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // 導入用戶儲存服務
    const { userStorage } = await import('./userStorage');
    try {
      return await userStorage.getUserByEmail(email);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return memStorage.getUserByEmail(email);
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    // 導入用戶儲存服務
    const { userStorage } = await import('./userStorage');
    try {
      // 同時寫入本地檔案和 Google Sheets (如果可用)
      const newUser = await userStorage.createUser(user);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Recording methods
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

  // Transcript methods
  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    return memStorage.createTranscript(transcript);
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    return memStorage.getTranscriptByRecordingId(recordingId);
  }

  // Note methods
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

export const storage = new EnhancedStorage();
