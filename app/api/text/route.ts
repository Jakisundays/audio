import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY,
});

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
  });
  return transcription.text;
};

// Función asincrónica para manejar la solicitud POST
export const POST = async (request: Request) => {
  // Obtener los datos del formulario de la solicitud
  const formData = await request.formData();
  const audioFile = formData.get("audio");

  // Verificar si se proporcionó un archivo de audio válido
  if (!(audioFile instanceof Blob)) {
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

  // Configurar el tamaño del fragmento y dividir el archivo de audio en fragmentos
  const cuantosMB: number = 1;
  const CHUNK_SIZE = cuantosMB * 1024 * 1024;
  const chunkBlobs: Blob[] = [];
  let start = 0;

  while (start < audioFile.size) {
    const end = Math.min(start + CHUNK_SIZE, audioFile.size);
    const chunkBlob = new Blob([audioFile.slice(start, end)], {
      type: audioFile.type,
    });
    chunkBlobs.push(chunkBlob);
    start = end;
  }
  console.log(`Total de fragmentos: ${chunkBlobs.length}`);
  console.log({ chunkBlobs });

  let filePaths: string[] = [];

  try {
    // Procesar todos los fragmentos en paralelo y obtener los nombres de archivo procesados
    const processedFiles = await Promise.all(chunkBlobs.map(processChunk));
    filePaths = processedFiles.map((_, i) => `audio_${i}.mp3`);
    console.log({ filePaths });

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
