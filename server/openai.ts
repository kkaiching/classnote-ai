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
        content: `You are an expert educational assistant that creates organized, comprehensive notes from lecture transcripts.
        Format the notes with clear hierarchical headings, bullet points for important facts, and numbered lists for steps or procedures.
        Use markdown format with # for title, ## for main sections, ### for subsections.
        Make the notes concise but thorough, capturing key concepts, definitions, and examples.
        If there are any technical terms, provide brief explanations.
        Structure the content logically following the flow of the lecture.`
      },
      {
        role: "user",
        content: `This is a transcript from a lecture or class about "${title}". Please create comprehensive, well-organized notes from this transcript:

${transcript}

Please format the notes with clear section headers, bullet points, and numbered lists where appropriate. Make them easy to read and study from.`
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
