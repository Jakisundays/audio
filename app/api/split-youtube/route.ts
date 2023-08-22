import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import fs from "fs";
// npm i openai
import OpenAI from "openai";
import srtParser2 from "srt-parser-2";
import ytdl from "ytdl-core";
// import streamToBlob from "stream-to-blob";

const parser = new srtParser2();

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY,
});

// Función asincrónica para procesar un fragmento de audio
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
    // .output(outputFileName)
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

// Función asincrónica para manejar la solicitud POST
export const POST = async (request: Request) => {
  const res = await request.json();
  const { url } = res;
  console.log({ url });

  const videoMetaData = await ytdl.getBasicInfo(url);

  console.log({ formats: videoMetaData.formats.map((f) => f.itag) });
  let audioFormats = ytdl.filterFormats(videoMetaData.formats, "audioonly");
  console.log({ audioFormats });

  const audioStream = ytdl(url, {
    quality: videoMetaData.formats[0].itag,
    filter: "audio",
    // format: "mp3",
    // filter: (format) => format.container === "mp4",
  });

  const fileStream = fs.createWriteStream("audio.mp3");
  audioStream.pipe(fileStream).on("finish", function () {
    console.log("FINISHED");
  });

  fileStream.on("error", (error) => {
    console.log({ error });
  });

  // console.log({ audioStream, tipo: typeof audioStream });

  return new Response(JSON.stringify("Procesamiento completado con éxito"), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // const youtubeBlob = await streamToBlob(videoStream);

  // Verificar si se proporcionó un archivo de audio válido
  // if (!(audioFile instanceof Blob)) {
  //   return new Response(
  //     JSON.stringify({
  //       message: "No se proporcionó un archivo de audio válido.",
  //     }),
  //     {
  //       status: 400,
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );
  // }

  // Configurar el tamaño del fragmento y dividir el archivo de audio en fragmentos
  // const cuantosMB: number = 2;
  // const CHUNK_SIZE = cuantosMB * 1024 * 1024;
  // const chunkBlobs: Blob[] = [];
  // let start = 0;

  // while (start < audioFile.size) {
  //   const end = Math.min(start + CHUNK_SIZE, audioFile.size);
  //   const chunkBlob = new Blob([audioFile.slice(start, end)], {
  //     type: audioFile.type,
  //   });
  //   chunkBlobs.push(chunkBlob);
  //   start = end;
  // }
  // console.log(`Total de fragmentos: ${chunkBlobs.length}`);
  // console.log({ chunkBlobs });
  // chunkBlobs: [
  //   Blob { size: 2097152, type: 'audio/mpeg' },
  //   Blob { size: 2097152, type: 'audio/mpeg' },
  //   Blob { size: 457517, type: 'audio/mpeg' }
  // ]

  // try {
  //   // Procesar todos los fragmentos en paralelo y obtener los nombres de archivo procesados
  //   const processedFiles = await Promise.all(chunkBlobs.map(processChunk));
  //   const filePaths = processedFiles.map((_, i) => `audio_${i}.mp3`);
  //   console.log({ filePaths });
  //   // [ 'audio_0.mp3', 'audio_1.mp3' ]
  //   const transcriptions = [];

  //   // Iterate over each file path and create a transcription
  //   for (const filePath of filePaths) {
  //     const transcription = await createTranscription(filePath);
  //     transcriptions.push(transcription);
  //   }
  //   // console.log({ transcriptions, string: transcriptions.join("\n") });
  //   const srt_array = parser.fromSrt(transcriptions.join("\n"));
  //   console.log({ srt_array });
  //   // Eliminamos los archivos de audio procesados para liberar espacio
  //   await Promise.all(
  //     filePaths.map(async (filePath) => {
  //       try {
  //         await fs.promises.unlink(filePath);
  //         console.log(`Archivo eliminado: ${filePath}`);
  //       } catch (error) {
  //         console.log(`Error al eliminar el archivo ${filePath}:`, error);
  //       }
  //     })
  //   );

  //   console.log("Procesamiento completado con éxito");
  // return new Response(JSON.stringify("Procesamiento completado con éxito"), {
  //   status: 200,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });
  // } catch (error) {
  //   console.log("Se produjo un error durante el procesamiento:", error);
  //   return new Response(
  //     JSON.stringify({
  //       message: "Se produjo un error durante el procesamiento.",
  //     }),
  //     {
  //       status: 500,
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );
  // }
};
