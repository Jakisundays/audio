import OpenAI from "openai";
import ytdl from "ytdl-core";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

export const POST = async (request: Request) => {
  const { url } = await request.json();
  let filePaths: string[] = [];
  try {
    const youtubeVidId = download(url);
    // console.log({ youtubeVidId });
    const audioPath = await convertToMp3(youtubeVidId, "ytAudio.mp3");
    // console.log({ audioPath });
    const audioBlob = await audioFileToBlob(audioPath);
    // console.log({ audioBlob });

    const cuantosMB: number = 2;
    const CHUNK_SIZE = cuantosMB * 1024 * 1024;
    const chunkBlobs: Blob[] = [];
    
    let start = 0;

    while (start < audioBlob.size) {
      const end = Math.min(start + CHUNK_SIZE, audioBlob.size);
      const chunkBlob = new Blob([audioBlob.slice(start, end)], {
        type: audioBlob.type,
      });
      chunkBlobs.push(chunkBlob);
      start = end;
    }

    const processedFiles = await Promise.all(chunkBlobs.map(processChunk));
    filePaths = processedFiles.map((_, i) => `audio_${i}.mp3`);
    const stream = new ReadableStream({
      async start(controller) {
        for (const filePath of filePaths) {
          const transcription = await createTranscription(filePath);
          controller.enqueue(transcription);
        }
        deleteAudios(filePaths);
        controller.close();
      },
    });

    console.log("Procesando");
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("Se produjo un error durante el procesamiento:", error);
    if (filePaths.length > 0) {
      deleteAudios(filePaths);
    }
    return new Response(
      JSON.stringify({
        message: "Se produjo un error durante el procesamiento.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

function download(videoLink: string) {
  const videoId = ytdl.getURLVideoID(videoLink);
  const video = ytdl(videoId, { filter: "audioonly" });
  return video;
}

async function convertToMp3(
  stream: Readable,
  filePath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    Ffmpeg()
      .input(stream)
      .toFormat("mp3")
      .output(filePath)
      .on("end", () => {
        console.log("Conversion successful");
        resolve(filePath);
      })
      .on("error", (err) => {
        console.error("Error with ffmpeg", err);
        reject("Error with ffmpeg");
      })
      .run();
  });
}

const audioFileToBlob = async (audioFilePath: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    fs.readFile(audioFilePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const blob = new Blob([data], { type: "audio/mp3" });
      resolve(blob);
    });
  });
};

const processChunk = async (chunkBlob: Blob, i: number): Promise<string> => {
  // Obtener el ArrayBuffer del fragmento de audio
  const audioArrayBuffer = await chunkBlob.arrayBuffer();
  const outputFileName = `audio_${i}.mp3`; // Nombre del archivo de salida

  return new Promise((resolve, reject) => {
    // Crear un flujo legible a partir del ArrayBuffer
    const audioStream = new Readable({
      read() {
        const buffer = Buffer.from(audioArrayBuffer);
        this.push(buffer);
        this.push(null);
      },
    });

    // Procesar el fragmento de audio utilizando FFmpeg
    Ffmpeg(audioStream)
      .format("mp3")
      .on("start", (commandLine: any) => {
        console.log("FFmpeg iniciado con el comando: " + commandLine);
      })
      .on("error", (err: any) => {
        console.log("Se produjo un error: " + err.message);
        reject(err);
      })
      .on("end", () => {
        console.log(`Procesamiento finalizado para ${outputFileName}`);
        resolve(outputFileName);
      })
      .save(outputFileName);
  });
};

const createTranscription = async (fileName: string) => {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: "whisper-1",
    response_format: "srt",
  });
  return transcription;
};

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY,
});

const deleteAudios = async (filePaths: string[]) => {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
        console.log(`Archivo eliminado: ${filePath}`);
      } catch (error) {
        console.log(`Error al eliminar el archivo ${filePath}:`, error);
      }
    })
  );
};
