import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

export const loginUserSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(6, "密碼不得少於6字元"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

// Recordings table
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  fileFormat: text("file_format").notNull(),
  duration: integer("duration"), // duration in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  transcribed: boolean("transcribed").default(false).notNull(),
  notesGenerated: boolean("notes_generated").default(false).notNull(),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

// Transcripts table
export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  recordingId: integer("recording_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  createdAt: true,
});

export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

// Notes table
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  recordingId: integer("recording_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// API response schemas for frontend
export const fileUploadResponseSchema = z.object({
  success: z.boolean(),
  recording: z.object({
    id: z.number(),
    title: z.string(),
    filename: z.string(),
    fileSize: z.number(),
    fileFormat: z.string(),
    duration: z.number().optional(),
    status: z.string(),
  }),
  message: z.string().optional(),
});

export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;

export const transcriptionResponseSchema = z.object({
  success: z.boolean(),
  transcript: z.object({
    id: z.number(),
    recordingId: z.number(),
    content: z.string(),
  }).optional(),
  message: z.string().optional(),
});

export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;

export const noteResponseSchema = z.object({
  success: z.boolean(),
  note: z.object({
    id: z.number(),
    recordingId: z.number(),
    content: z.string(),
  }).optional(),
  message: z.string().optional(),
});

export type NoteResponse = z.infer<typeof noteResponseSchema>;
