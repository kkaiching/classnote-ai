import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Audio transcription 
export async function transcribeAudio(audioFilePath: string): Promise<{ text: string, duration: number }> {
  const audioReadStream = fs.createReadStream(audioFilePath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioReadStream,
    model: "whisper-1",
  });

  return {
    text: transcription.text,
    duration: transcription.duration || 0,
  };
}

// Generate notes from transcript
export async function generateNotes(transcript: string, title: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `你是一位專業的 AI 學習助理，擅長整理課堂錄音逐字稿並轉化為結構化的學習筆記與複習資料。請依據逐字稿，輸出兩個部分的內容：

# [課程名稱] - [章節/主題] 

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

## 學習建議與行動

### 重點筆記匯出
- **重點 1：** [核心觀念的簡短總結] 
- **重點 2：** [核心觀念的簡短總結] 

### 專有名詞與定義
- **[專有名詞 1]：** [定義或解釋] 
- **[專有名詞 2]：** [定義或解釋] 

### 學習重點方向整理
- 考前重點方向 1：[簡要描述可能考查的知識點或題型] 
- 考前重點方向 2：[簡要描述可能考查的知識點或題型]`
      },
      {
        role: "user",
        content: `這是一份關於「${title}」的課程錄音逐字稿。請幫我整理成結構化的學習筆記與複習資料：

${transcript}

請使用適當的標題結構、重點條列，確保內容清晰易讀。`
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
