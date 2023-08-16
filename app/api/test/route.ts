import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

interface Audio {
  size: number;
  type: string;
}

// Function to divide a Blob
function divideBlob(blob: Blob, chunkSize: number): Blob[] {
  const totalChunks = Math.ceil(blob.size / chunkSize);
  const chunksArray: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, blob.size);
    const chunkBlob = blob.slice(start, end);
    chunksArray.push(chunkBlob);
  }

  return chunksArray;
}

// Usage

export async function POST(request: Request) {
  console.log("/backend");
  const formData = await request.formData();
  const audioFile = formData.get("audio");
  console.log({ audioFile });
  //{ audioFile: Blob { size: 5495255, type: 'audio/mpeg' } }

  const chunkSize = 20 * 1024 * 1024; // 20 megabytes in bytes

//   const blobChunks = divideBlob(audioFile as Blob, chunkSize);

//   console.log({ blobChunks });

  if (!audioFile) {
    console.error("No se seleccionó ningún archivo de audio");
    return NextResponse.json({
      error: "No se seleccionó ningún archivo de audio",
    });
  }

  // Make sure audioFile is of type Blob or File
  if (!(audioFile instanceof Blob)) {
    console.error("El archivo de audio es inválido");
    return NextResponse.json({
      error: "El archivo de audio es inválido",
    });
  }

  const audio: Audio = {
    size: audioFile.size,
    type: audioFile.type,
  };

  const sizeInBytes = audio.size;
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  //   console.log({ audio });
  //   console.log(`Tamaño en megabytes: ${sizeInMegabytes}`);

  // Convert Blob to ArrayBuffer
  const audioArrayBuffer = await audioFile.arrayBuffer();

  //   console.log({ audioArrayBuffer });

  // Convert ArrayBuffer to Readable stream
  const audioStream = new Readable({
    read() {
      // Convert the ArrayBuffer to a Buffer
      const buffer = Buffer.from(audioArrayBuffer);
      this.push(buffer);
      this.push(null);
    },
  });

  //   console.log({ audioStream });
  let audioDuration: number = 0;

    ffmpeg(audioStream).ffprobe((err, metadata) => {
      if (err) {
        console.error("Error getting audio duration:", err);
      }
      console.log({ metadata });
      audioDuration = metadata.format.duration as number; // Use a type assertion
      console.log(`Audio Duration: ${audioDuration} seconds`);
    });

//   ffmpeg("public/billy.mp3").ffprobe((err, metadata) => {
//     if (err) {
//       console.error("Error getting audio duration:", err);
//     }
//     console.log({ billy: metadata });
//   });
  // Output directory for the split audio parts
//   const outputDirectory = "/audios"; // Cambia la ruta al directorio de salida

  //   ffmpeg(audioStream)
  //     .output("outputfile.mp3")
  //     .format("mp3")
  //     .on("start", function (commandLine: any) {
  //       console.log("Spawned Ffmpeg with command: " + commandLine);
  //     })
  //     .on("error", function (err: any) {
  //       console.log("An error occurred: " + err.message);
  //     })
  //     .on("end", function () {
  //       console.log("Finished processing");
  //     })
  //     .run();

  return NextResponse.json({ audio });
}
