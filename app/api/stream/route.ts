import { createTranscription, deleteAudios, extractType, processChunk } from "@/utils/audioHelpers";

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

  const chunkType = extractType(audioFile);

  if (!chunkType) {
    throw new Error("No se pudo determinar el tipo de archivo");
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
