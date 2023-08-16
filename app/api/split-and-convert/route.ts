import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get("audio");

  if (audioFile instanceof Blob) {
    const cuantosMB: number = 2;
    const CHUNK_SIZE = cuantosMB * 1024 * 1024; // Tamaño del fragmento en bytes (por ejemplo, 2 MB) 1024 = valor binario
    let start = 0;
    let end = Math.min(CHUNK_SIZE, audioFile.size);
    const chunkBlobs = [];

    // Dividir el archivo de audio en fragmentos
    while (start < audioFile.size) {
      const chunkBlob = new Blob([audioFile.slice(start, end)], {
        type: audioFile.type,
      });
      chunkBlobs.push(chunkBlob);

      // Preparar para el siguiente fragmento
      start = end;
      end = Math.min(start + CHUNK_SIZE, audioFile.size);
    }
    console.log({ chunkBlobs });

    // Iterar a través de cada fragmento y procesarlos uno por uno
    for (let i = 0; i < chunkBlobs.length; i++) {
      const chunkBlob = chunkBlobs[i];
      const audioArrayBuffer = await chunkBlob.arrayBuffer();
      const outputFileName = `audio_${i}.mp3`; // Establecer el nombre de archivo de salida

      // Convertir ArrayBuffer a un flujo legible
      const audioStream = new Readable({
        read() {
          // Convertir el ArrayBuffer en un búfer
          const buffer = Buffer.from(audioArrayBuffer);
          this.push(buffer);
          this.push(null);
        },
      });

      // Procesar el fragmento con FFmpeg
      Ffmpeg(audioStream)
        .output(outputFileName) // Establecer el nombre del archivo de salida
        .format("mp3")
        .on("start", function (commandLine: any) {
          console.log("FFmpeg iniciado con el comando: " + commandLine);
        })
        .on("error", function (err: any) {
          console.log("Se produjo un error: " + err.message);
        })
        .on("end", function () {
          console.log("Procesamiento finalizado");
        })
        .run();
    }
    // Devolver una respuesta con información sobre chunkBlobs (puedes modificar esto si es necesario)
    return new Response(JSON.stringify(chunkBlobs), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    return new Response("No se proporcionó un archivo de audio válido.", {
      status: 400,
    });
  }
}
