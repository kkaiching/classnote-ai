import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Audio transcription 
export async function transcribeAudio(audioFilePath: string): Promise<{ text: string, duration: number }> {
  try {
    // Check the file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`File does not exist: ${audioFilePath}`);
    }
    
    // Get file stats to check size
    const stats = fs.statSync(audioFilePath);
    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }
    
    // Log file info for debugging
    console.log(`Transcribing file: ${audioFilePath}, size: ${stats.size} bytes`);
    
    // Convert to MP3 format which is widely supported by OpenAI
    const fileExt = path.extname(audioFilePath);
    const baseFilePath = audioFilePath.slice(0, -fileExt.length);
    const mp3FilePath = `${baseFilePath}.mp3`;
    
    try {
      console.log(`Converting ${fileExt} file to MP3 format...`);
      await execPromise(`ffmpeg -i ${audioFilePath} -vn -ar 44100 -ac 2 -b:a 192k ${mp3FilePath}`);
      console.log(`Conversion completed: ${mp3FilePath}`);
      
      // Get file stats for converted file
      const mp3Stats = fs.statSync(mp3FilePath);
      console.log(`Converted file size: ${mp3Stats.size} bytes`);
      
      // Create file stream for OpenAI API from the converted MP3
      const audioReadStream = fs.createReadStream(mp3FilePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
      });
      
      // Clean up the converted file
      fs.unlinkSync(mp3FilePath);
      
      // Calculate approximate duration based on word count
      // Average speaking rate is ~150 words per minute
      const wordCount = transcription.text.split(/\s+/).length;
      const approximateDuration = Math.max(wordCount / 2.5, 10); // At least 10 seconds
      
      return {
        text: transcription.text,
        duration: approximateDuration,
      };
    } catch (conversionError) {
      console.error("Error converting audio format:", conversionError);
      
      // If conversion fails, try direct upload as fallback
      console.log("Attempting direct transcription without format conversion...");
      const audioReadStream = fs.createReadStream(audioFilePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
      });
      
      const wordCount = transcription.text.split(/\s+/).length;
      const approximateDuration = Math.max(wordCount / 2.5, 10);
      
      return {
        text: transcription.text,
        duration: approximateDuration,
      };
    }
  } catch (error) {
    console.error("Error transcribing audio:", error);
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
export async function parseTranscriptWithTimestamps(transcript: string): Promise<{ parsedTranscript: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert at parsing raw transcripts into structured formats. 
        Your task is to add timestamps and identify speakers in a transcript.
        Format each segment with a timestamp at the beginning (in MM:SS format) and identify the speaker if possible.
        If the speaker can't be identified, use "Speaker" as the default.
        Generate a response in JSON format with a 'parsedTranscript' field containing the formatted transcript.`
      },
      {
        role: "user",
        content: `Please parse this raw transcript, adding timestamps approximately every 30 seconds and identifying speakers when possible:

${transcript}`
      }
    ],
    response_format: { type: "json_object" },
  });

  try {
    const parsedResponse = JSON.parse(response.choices[0].message.content || "{}");
    return {
      parsedTranscript: parsedResponse.parsedTranscript || transcript
    };
  } catch (error) {
    console.error("Error parsing transcript with timestamps:", error);
    return { parsedTranscript: transcript };
  }
}
