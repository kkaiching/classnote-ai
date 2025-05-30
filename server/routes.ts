import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { insertRecordingSchema, insertTranscriptSchema, insertNoteSchema, insertUserSchema, loginUserSchema } from "@shared/schema";
import { transcribeAudio, generateNotes, parseTranscriptWithTimestamps } from "./openai";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Handle common mobile recording formats and their mime types
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4',
      'audio/m4a', 'audio/x-m4a', 'audio/aac',
      'audio/wav', 'audio/x-wav', 'audio/webm',
      'audio/ogg', 'audio/oga', 'audio/flac',
      'audio/x-aac', 'audio/x-caf', 'audio/3gpp',
      'audio/3gpp2', 'audio/amr'
    ];
    
    // Also check file extension as fallback
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.webm', '.aac', '.ogg', '.flac', '.amr', '.3gp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Accept file if either mime type or extension matches
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      console.log(`Rejected file: ${file.originalname} (${file.mimetype})`);
      cb(new Error(`Invalid file format. Supported formats: MP3, M4A, WAV, WebM, AAC, OGG, FLAC, AMR, 3GP. Received: ${file.mimetype}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register new user
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          success: false, 
          message: "資料驗證失敗", 
          errors: validatedData.error.errors 
        });
      }

      // Check if user with the same email already exists
      const existingUser = await storage.getUserByEmail(validatedData.data.email);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: "此電子郵件已經被註冊" 
        });
      }

      // Create user
      const user = await storage.createUser(validatedData.data);
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ 
        success: true, 
        message: "註冊成功", 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ 
        success: false, 
        message: "註冊失敗，請稍後再試" 
      });
    }
  });

  // Login user
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          success: false, 
          message: "資料驗證失敗", 
          errors: validatedData.error.errors 
        });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.data.email);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "此帳號尚未註冊", 
          notRegistered: true
        });
      }

      // Check password
      if (user.password !== validatedData.data.password) {
        return res.status(401).json({ 
          success: false, 
          message: "密碼錯誤，請再試一次", 
          wrongPassword: true
        });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        success: true, 
        message: "登入成功，歡迎回來！", 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ 
        success: false, 
        message: "登入失敗，請稍後再試" 
      });
    }
  });

  // Get current user
  app.get("/api/user", async (req: Request, res: Response) => {
    // This is a placeholder for actual authentication
    // In a real implementation, you would check session or JWT token
    res.status(401).json({ 
      success: false, 
      message: "未登入" 
    });
  });

  // Get all recordings
  app.get("/api/recordings", async (req: Request, res: Response) => {
    try {
      const recordings = await storage.getAllRecordings();
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  // Get a specific recording
  app.get("/api/recordings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      res.json(recording);
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ message: "Failed to fetch recording" });
    }
  });
  
  // Delete a recording
  app.delete("/api/recordings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      // 確認錄音存在
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      // 從檔案系統刪除音檔
      const filePath = path.join(uploadsDir, recording.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 從存儲中刪除錄音
      const success = await storage.deleteRecording(id);
      if (success) {
        res.status(200).json({ success: true, message: "Recording deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete recording" });
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      res.status(500).json({ success: false, message: "Failed to delete recording" });
    }
  });
  
  // Update recording title
  app.patch("/api/recordings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }
      
      // 驗證請求體
      const schema = z.object({
        title: z.string().min(1, "標題不得為空")
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid input", 
          errors: result.error.errors 
        });
      }
      
      const { title } = result.data;
      
      // 確認錄音存在
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ success: false, message: "Recording not found" });
      }
      
      // 更新標題
      const updatedRecording = await storage.updateRecordingTitle(id, title);
      if (updatedRecording) {
        res.status(200).json({ 
          success: true, 
          message: "Recording title updated successfully",
          recording: updatedRecording
        });
      } else {
        res.status(500).json({ success: false, message: "Failed to update recording title" });
      }
    } catch (error) {
      console.error("Error updating recording title:", error);
      res.status(500).json({ success: false, message: "Failed to update recording title" });
    }
  });

  // Upload a new audio file
  app.post("/api/uploadAudio", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const file = req.file;
      const title = req.body.title || path.basename(file.originalname, path.extname(file.originalname));
      
      // Calculate file size in MB for display
      const fileSizeInMB = file.size / (1024 * 1024);
      
      // Get file format
      const fileFormat = path.extname(file.originalname).substring(1).toUpperCase();

      // Create recording in storage
      const recording = await storage.createRecording({
        title,
        filename: file.filename,
        fileSize: file.size,
        fileFormat,
        duration: 0, // Will be updated after transcription
        status: 'pending',
        transcribed: false,
        notesGenerated: false,
      });

      res.status(201).json({
        success: true,
        recording: {
          id: recording.id,
          title: recording.title,
          filename: recording.filename,
          fileSize: recording.fileSize,
          fileFormat: recording.fileFormat,
          duration: recording.duration,
          status: recording.status,
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ success: false, message: "Failed to upload file" });
    }
  });

  // Transcribe audio file
  app.post("/api/transcribe/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ success: false, message: "Recording not found" });
      }

      // Update recording status
      await storage.updateRecordingStatus(id, 'processing');

      // Get file path
      const filePath = path.join(uploadsDir, recording.filename);
      if (!fs.existsSync(filePath)) {
        await storage.updateRecordingStatus(id, 'failed');
        return res.status(404).json({ success: false, message: "Audio file not found" });
      }

      // Transcribe audio
      try {
        const { text, duration } = await transcribeAudio(filePath);
        
        // Create transcript
        const transcript = await storage.createTranscript({
          recordingId: id,
          content: text,
        });

        // Update recording with duration and transcribed status
        await storage.updateRecordingStatus(id, 'completed');
        await storage.updateRecordingTranscribed(id, true);
        
        const updatedRecording = await storage.getRecording(id);
        if (updatedRecording && duration) {
          const durationInSeconds = Math.floor(duration);
          await storage.updateRecordingStatus(id, 'completed');
          
          res.json({ 
            success: true, 
            transcript: {
              id: transcript.id,
              recordingId: transcript.recordingId,
              content: transcript.content,
            },
            duration: durationInSeconds
          });
        } else {
          res.json({ 
            success: true, 
            transcript: {
              id: transcript.id,
              recordingId: transcript.recordingId,
              content: transcript.content,
            }
          });
        }
      } catch (error) {
        console.error("Error transcribing audio:", error);
        await storage.updateRecordingStatus(id, 'failed');
        res.status(500).json({ success: false, message: "Failed to transcribe audio" });
      }
    } catch (error) {
      console.error("Error processing transcription request:", error);
      res.status(500).json({ success: false, message: "Failed to process transcription request" });
    }
  });

  // Get transcript for a recording
  app.get("/api/recordings/:id/transcript", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      const transcript = await storage.getTranscriptByRecordingId(id);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }

      // Parse transcript with timestamps
      try {
        const { parsedTranscript } = await parseTranscriptWithTimestamps(transcript.content);
        res.json({ content: parsedTranscript });
      } catch (error) {
        console.error("Error parsing transcript:", error);
        res.json({ content: transcript.content });
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      res.status(500).json({ message: "Failed to fetch transcript" });
    }
  });

  // Generate notes for a recording
  app.post("/api/generateNote/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ success: false, message: "Recording not found" });
      }

      const transcript = await storage.getTranscriptByRecordingId(id);
      if (!transcript) {
        return res.status(404).json({ success: false, message: "Transcript not found. Please transcribe the recording first." });
      }

      // Update recording status
      await storage.updateRecordingStatus(id, 'processing');

      try {
        // Generate notes from transcript
        const notesContent = await generateNotes(transcript.content, recording.title);
        
        // Check if notes already exist for this recording
        const existingNotes = await storage.getNoteByRecordingId(id);
        
        let note;
        if (existingNotes) {
          // Update existing notes
          note = await storage.updateNote(existingNotes.id, notesContent);
        } else {
          // Create new notes
          note = await storage.createNote({
            recordingId: id,
            content: notesContent,
          });
        }

        // Update recording status
        await storage.updateRecordingStatus(id, 'completed');
        await storage.updateRecordingNotesGenerated(id, true);

        res.json({ 
          success: true, 
          note: {
            id: note!.id,
            recordingId: note!.recordingId,
            content: note!.content,
          }
        });
      } catch (error) {
        console.error("Error generating notes:", error);
        await storage.updateRecordingStatus(id, 'failed');
        res.status(500).json({ success: false, message: "Failed to generate notes" });
      }
    } catch (error) {
      console.error("Error processing note generation request:", error);
      res.status(500).json({ success: false, message: "Failed to process note generation request" });
    }
  });

  // Get notes for a recording
  app.get("/api/recordings/:id/notes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      const notes = await storage.getNoteByRecordingId(id);
      if (!notes) {
        return res.status(404).json({ message: "Notes not found" });
      }

      res.json({ content: notes.content });
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // Serve audio files
  app.get("/api/audio/:filename", (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Audio file not found" });
    }
    
    res.sendFile(filePath);
  });

  // Download audio file with custom filename
  app.get("/api/recordings/:id/download", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }
      
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      const filePath = path.join(uploadsDir, recording.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Determine file extension from the original filename
      const fileExt = path.extname(recording.filename);
      // Safe filename for download
      const safeTitle = recording.title.replace(/[^a-z0-9]/gi, '_');
      const downloadFilename = `${safeTitle}${fileExt}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading recording:", error);
      res.status(500).json({ message: "Failed to download recording" });
    }
  });
  
  // Download transcript as text file
  app.get("/api/recordings/:id/transcript/download", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }
      
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      const transcript = await storage.getTranscriptByRecordingId(id);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      
      // Safe filename for download
      const safeTitle = recording.title.replace(/[^a-z0-9]/gi, '_');
      const downloadFilename = `${safeTitle}_transcript.txt`;
      
      // Format transcript content
      let formattedContent = transcript.content;
      
      try {
        // Check if content is JSON string
        if (typeof transcript.content === 'string' && (
            transcript.content.startsWith('[') || 
            transcript.content.startsWith('{')
        )) {
          const parsedContent = JSON.parse(transcript.content);
          if (Array.isArray(parsedContent)) {
            formattedContent = parsedContent
              .map((item: any) => `${item.timestamp || ''} ${item.speaker || ''}：${item.text || ''}`)
              .join('\n');
          }
        }
      } catch (e) {
        console.log("Error parsing transcript content, using as is:", e);
      }
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.send(formattedContent);
    } catch (error) {
      console.error("Error downloading transcript:", error);
      res.status(500).json({ message: "Failed to download transcript" });
    }
  });
  
  // Download notes as text file
  app.get("/api/recordings/:id/notes/download", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recording ID" });
      }
      
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      const note = await storage.getNoteByRecordingId(id);
      if (!note) {
        return res.status(404).json({ message: "Notes not found" });
      }
      
      // Safe filename for download
      const safeTitle = recording.title.replace(/[^a-z0-9]/gi, '_');
      const downloadFilename = `${safeTitle}_notes.txt`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.send(note.content);
    } catch (error) {
      console.error("Error downloading notes:", error);
      res.status(500).json({ message: "Failed to download notes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
