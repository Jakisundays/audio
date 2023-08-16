import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

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
    Ffmpeg(audioStream)
      .output(outputFileName)
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
      .run();
  });
};

// Función asincrónica para manejar la solicitud POST
export const POST = async (request: Request): Promise<Response> => {
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

  try {
    // Procesar todos los fragmentos en paralelo y obtener los nombres de archivo procesados
    const processedFiles = await Promise.all(chunkBlobs.map(processChunk));
    const filePath = processedFiles.map((_, i) => `audio_${i}.mp3`);
    console.log({ filePath });
    console.log("Procesamiento completado con éxito");
    return new Response(JSON.stringify({ processedFiles }), {
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
