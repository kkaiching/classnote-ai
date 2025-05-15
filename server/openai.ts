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
        content: `你是一位專業的 AI 學習助理，擅長整理課堂錄音逐字稿並轉化為結構化的學習筆記與複習資料。你的目標是協助學生快速回顧課程重點、加強理解，並高效準備考試。請依據逐字稿，輸出兩個部分的內容： 

一、錄音摘要（Lecture Summary）

【摘要任務說明】 
請根據以下逐字稿，整理出課堂中的：
核心觀念與原理（請清晰闡述）
重要的例子與案例分析（簡述例子並說明其作用）
老師的延伸補充說明或額外知識點
學生與老師的互動問答環節（簡述問題與回答要點）
重要的時間點或強調語氣（若有，可標註）

【摘要觀點主軸】
聚焦於知識點的提煉、概念的解釋和理解的促進，協助學生掌握課程精髓。 

【輸出格式】
請依據以下格式輸出錄音摘要，並明確使用階層式標題結構，請使用 H1 / H2 / H3 結構撰寫摘要，符合以下格式：

# [YYYY-MM-DD] [課程名稱] - [章節/主題] 

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

3. 學習重點方向整理
基於本次課堂內容，提供學習該章節、課程的方向，目的是要幫助我知道我可以從哪裡開始複習。

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
