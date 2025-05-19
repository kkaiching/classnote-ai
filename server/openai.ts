import OpenAI from "openai";
import fs from "fs";
import { AssemblyAI } from "assemblyai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Initialize AssemblyAI client with API key
const assemblyClient = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || ""  // Default to empty string if undefined
});

// Audio transcription using AssemblyAI
export async function transcribeAudio(audioFilePath: string): Promise<{ text: string, duration: number }> {
  try {
    // Check if the API key is available
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error("AssemblyAI API key is not configured");
    }
    
    // Read the file content
    const fileBuffer = fs.readFileSync(audioFilePath);
    
    // Use AssemblyAI to transcribe the audio file
    const transcript = await assemblyClient.transcripts.transcribe({
      audio: fileBuffer,
      language_code: "zh", // Chinese (using standard code instead of zh-TW)
    });
    
    // Extract duration (convert from milliseconds to seconds if needed)
    const durationInSeconds = transcript.audio_duration ? transcript.audio_duration / 1000 : 0;
    
    return {
      text: transcript.text || "",
      duration: durationInSeconds,
    };
  } catch (error) {
    console.error("Error in AssemblyAI transcription:", error);
    throw error;
  }
}

// Generate notes from transcript
export async function generateNotes(transcript: string, title: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `# [課程名稱] - [章節/主題] 

## 核心觀念與原理 
- [核心觀念 1]：[清晰的解釋說明] 
- [核心觀念 2]：[清晰的解釋說明] 

## 例子與案例分析 

### [例子標題 1] 
- 例子簡述：[簡要描述例子] 
- 作用說明：[解釋該例子如何說明核心觀念] 

### [例子標題 2] 
- 例子簡述：[簡要描述例子] 
- 作用說明：[解釋該例子如何說明核心觀念] 

## 延伸補充 
- [補充說明 1] 
- [補充說明 2] 

## 互動問答（若沒有問答就不需摘要）
- 整理課堂中的常見問題

摘要注意事項：
使用清晰的標題和條列式重點呈現
核心觀念的解釋應簡明扼要，重點突出
例子和案例分析應點明其與核心觀念的關聯
互動問答部分應聚焦於重要的知識澄清
可以適當標註老師強調的語氣或重要的時間點

二、學習建議與行動（Learning Suggestions & Actions）

請依據課堂錄音摘要的內容，輸出一份包含學習重點和後續行動建議的綜合整理，請依下列四個區塊呈現，協助學生高效學習和複習。

1. 重點筆記匯出
根據摘要內容，整理出本堂課最核心的幾個知識點或原理，形成簡潔的筆記列表。

格式： 
- **重點 1：** [核心觀念的簡短總結] 
- **重點 2：** [核心觀念的簡短總結] 
- ... 

2. 專有名詞與定義
從摘要中提取重要的專有名詞，並提供其在課堂語境下的定義或解釋。

格式：
- **[專有名詞 1]：** [定義或解釋] 
- **[專有名詞 2]：** [定義或解釋] 
- ... 

4. 學習重點方向整理
基於本次課堂內容，提供學習該章節、課程的方向，目的是要幫助我知道我可以從哪裡開始複習，

格式：
- 考前重點方向 1：[簡要描述可能考查的知識點或題型] 
- 考前重點方向 2：[簡要描述可能考查的知識點或題型]`
      },
      {
        role: "user",
        content: `這是一份關於「${title}」的課程錄音逐字稿。請幫我整理成結構化的學習筆記與複習資料，遵循我提供的格式要求：

${transcript}

請記得使用適當的標題結構、重點條列，並確保內容易於閱讀和理解。`
      }
    ],
  });

  return response.choices[0].message.content || "No content generated";
}

// Parse transcript with timestamps
export async function parseTranscriptWithTimestamps(transcript: string): Promise<{ parsedTranscript: Array<{ timestamp: string; speaker: string; text: string }> }> {
  try {
    // For AssemblyAI output, we need to parse the plain text and create a structured format
    // that matches what the frontend expects
    
    // Since AssemblyAI doesn't provide speaker diarization by default in the basic implementation,
    // we'll create our own structure with default speaker and divide text into segments

    // Parse the transcript into segments (approximately every 30 seconds)
    const segments: Array<{ timestamp: string; speaker: string; text: string }> = [];
    
    // Split the transcript into sentences or natural breaks
    const lines = transcript.split(/(?<=[.!?])\s+/);
    const totalLines = lines.length;
    
    if (totalLines === 0) {
      return { parsedTranscript: [] };
    }
    
    // Create segments with timestamps (approximately)
    const segmentLength = Math.max(1, Math.ceil(totalLines / 10)); // Aim for about 10 segments
    
    for (let i = 0; i < totalLines; i += segmentLength) {
      const segmentText = lines.slice(i, Math.min(i + segmentLength, totalLines)).join(' ');
      
      // Calculate an approximate timestamp based on position in the transcript
      // Format as MM:SS
      const minutes = Math.floor((i / totalLines) * 10); // Assuming ~10 minute audio
      const seconds = Math.floor(((i / totalLines) * 10 % 1) * 60);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      segments.push({
        timestamp: timestamp,
        speaker: "講者",
        text: segmentText.trim()
      });
    }
    
    return { parsedTranscript: segments };
  } catch (error) {
    console.error("Error parsing transcript with timestamps:", error);
    
    // Return a simple fallback with the entire transcript as one segment
    return { 
      parsedTranscript: [{
        timestamp: "00:00",
        speaker: "講者",
        text: transcript
      }]
    };
  }
}
