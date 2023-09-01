import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import fs from "fs";
// npm i openai
import OpenAI from "openai";
import srtParser2 from "srt-parser-2";

const parser = new srtParser2();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  // Obtener los datos del formulario de la solicitud
  const formData = await request.formData();
  const audioFile = formData.get("audio");
  console.log({ audioFile });

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
  const cuantosMB: number = 2;
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
  // chunkBlobs: [
  //   Blob { size: 2097152, type: 'audio/mpeg' },
  //   Blob { size: 2097152, type: 'audio/mpeg' },
  //   Blob { size: 457517, type: 'audio/mpeg' }
  // ]

  try {
    // Procesar todos los fragmentos en paralelo y obtener los nombres de archivo procesados
    const processedFiles = await Promise.all(chunkBlobs.map(processChunk));
    const filePaths = processedFiles.map((_, i) => `audio_${i}.mp3`);
    console.log({ filePaths });
    // [ 'audio_0.mp3', 'audio_1.mp3' ]
    const transcriptions = [];

    // Iterate over each file path and create a transcription
    for (const filePath of filePaths) {
      const transcription = await createTranscription(filePath);
      transcriptions.push(transcription);
    }
    // console.log({ transcriptions, string: transcriptions.join("\n") });
    const srt_array = parser.fromSrt(transcriptions.join("\n"));
    console.log({ srt_array });
    // srt_array: [
    //   {
    //     id: '1',
    //     startTime: '00:00:00,000',
    //     startSeconds: 0,
    //     endTime: '00:00:10,680',
    //     endSeconds: 10.68,
    //     text: 'Vamos a realizar paso a paso esta división, y al final realizaremos su comprobación.'
    //   },
    //   {
    //     id: '2',
    //     startTime: '00:00:10,680',
    //     startSeconds: 10.68,
    //     endTime: '00:00:18,060',
    //     endSeconds: 18.06,
    //     text: 'Tenemos 1,607 que es el dividendo, y 2 que es el divisor, entonces tenemos en este caso'
    //   },
    //   {
    //     id: '3',
    //     startTime: '00:00:18,060',
    //     startSeconds: 18.06,
    //     endTime: '00:00:21,380',
    //     endSeconds: 21.38,
    //     text: 'una división por una cifra.'
    //   },]


    // Eliminamos los archivos de audio procesados para liberar espacio
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

    console.log("Procesamiento completado con éxito");
    return new Response(JSON.stringify(srt_array), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("Se produjo un error durante el procesamiento:", error);
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
