import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY,
});

const extractType = (blob: Blob): string | null => {
  const type = blob.type;
  const slashIndex = type.indexOf("/");

  if (slashIndex !== -1 && slashIndex < type.length - 1) {
    return type.substr(slashIndex + 1);
  }

  return null;
};

// Function to delete audio files asynchronously
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

// Function to process a chunk of audio asynchronously
const processChunk = async (chunkBlob: Blob, i: number): Promise<string> => {
  // Obtener el ArrayBuffer del fragmento de audio
  // const chunkType = extractType(chunkBlob);

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
      // .format(chunkType)
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

const createTranscription = async (fileName: string) => {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: "whisper-1",
    response_format: "srt",
  });
  return transcription;
};

const videoToAudio = async (video: Blob, user: string): Promise<string> => {
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

// Función asincrónica para manejar la solicitud POST
export const POST = async (request: Request) => {
  let filePaths: string[] = [];
  try {
    // Obtener los datos del formulario de la solicitud
    const formData = await request.formData();
    const video = formData.get("video");

    // Verificar si se proporcionó un archivo de audio válido
    if (!(video instanceof Blob)) {
      return new Response(
        JSON.stringify({
          message: "No se proporcionó un archivo de audio válido.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const chunkType = extractType(video);

    if (!chunkType) {
      throw new Error("No se pudo determinar el tipo de archivo");
    }

    const audioNoVidPath = await videoToAudio(video, "hasbulla");

    const audioBlob = await audioFileToBlob(audioNoVidPath);
    // Procesar el fragmento de audio utilizando FFmpeg

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

    // Configurar el tamaño del fragmento y dividir el archivo de audio en fragmentos
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
