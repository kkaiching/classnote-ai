import { recordings, transcripts, notes, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Note, type InsertNote, users, type User, type InsertUser } from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
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

import { db } from "./db";
import { eq } from "drizzle-orm";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Recording methods
  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const [recording] = await db
      .insert(recordings)
      .values(insertRecording)
      .returning();
    return recording;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording;
  }

  async getAllRecordings(): Promise<Recording[]> {
    return await db.select().from(recordings).orderBy(recordings.createdAt);
  }

  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set({ status })
      .where(eq(recordings.id, id))
      .returning();
    return updated;
  }

  async updateRecordingTranscribed(id: number, transcribed: boolean): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set({ transcribed })
      .where(eq(recordings.id, id))
      .returning();
    return updated;
  }

  async updateRecordingNotesGenerated(id: number, notesGenerated: boolean): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set({ notesGenerated })
      .where(eq(recordings.id, id))
      .returning();
    return updated;
  }

  async updateRecordingTitle(id: number, title: string): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set({ title })
      .where(eq(recordings.id, id))
      .returning();
    return updated;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const result = await db
      .delete(recordings)
      .where(eq(recordings.id, id));
    return true;
  }

  // Transcript methods
  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const [transcript] = await db
      .insert(transcripts)
      .values(insertTranscript)
      .returning();
    return transcript;
  }

  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript | undefined> {
    const [transcript] = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.recordingId, recordingId));
    return transcript;
  }

  // Note methods
  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values(insertNote)
      .returning();
    return note;
  }

  async getNoteByRecordingId(recordingId: number): Promise<Note | undefined> {
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.recordingId, recordingId));
    return note;
  }

  async updateNote(id: number, content: string): Promise<Note | undefined> {
    const [updated] = await db
      .update(notes)
      .set({ content })
      .where(eq(notes.id, id))
      .returning();
    return updated;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
