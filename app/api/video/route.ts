import {
  audioFileToBlob,
  createTranscription,
  deleteAudios,
  extractType,
  processChunk,
  videoToAudio,
} from "@/utils/audioHelpers";


// Función asincrónica para manejar la solicitud POST
export const POST = async (request: Request) => {
  console.log("entrando a video to audio");
  let filePaths: string[] = [];
  try {
    // Obtener los datos del formulario de la solicitud
    const formData = await request.formData();
    const video = formData.get("audio");

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
