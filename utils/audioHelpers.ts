import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import OpenAI from "openai";
import ytdl from "ytdl-core";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const createTranscription = async (fileName: string) => {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: "whisper-1",
    response_format: "srt",
  });
  return transcription;
};

export const extractType = (blob: Blob): string | null => {
  const type = blob.type;
  const slashIndex = type.indexOf("/");

  if (slashIndex !== -1 && slashIndex < type.length - 1) {
    return type.substr(slashIndex + 1);
  }
  return null;
};

export const deleteAudios = async (filePaths: string[]) => {
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

export const processChunk = async (
  chunkBlob: Blob,
  i: number
): Promise<string> => {
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

    Ffmpeg(audioStream)
      .toFormat("mp3")
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

export const audioFileToBlob = async (audioFilePath: string): Promise<Blob> => {
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

export const convertToMp3 = async (
  stream: Readable,
  filePath: string
): Promise<string> => {
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
};

export const download = (videoLink: string) => {
  // const videoId = ytdl.getURLVideoID(videoLink);
  const video = ytdl(videoLink, { filter: "audioonly" });
  return video;
};

export const videoToAudio = async (
  video: Blob,
  user: string
): Promise<string> => {
  const audioArrayBuffer = await video.arrayBuffer();
  const audioStream = new Readable({
    read() {
      const buffer = Buffer.from(audioArrayBuffer);
      this.push(buffer);
      this.push(null);
    },
  });
  const outputFileName = `onlyaudio-${user}.mp3`;
  return new Promise((resolve, reject) => {
    Ffmpeg(audioStream)
      .toFormat("mp3")
      .on("start", (commandLine: any) => {
        console.log("FFmpeg iniciado con el comando: " + commandLine);
      })
      .on("error", (err: any) => {
        console.log("Se produjo un error: " + err.message);
        reject("Error with ffmpeg");
      })
      .on("end", () => {
        console.log(`Procesamiento finalizado para ${outputFileName}`);
        resolve(outputFileName);
      })
      .save(outputFileName);
  });
};
