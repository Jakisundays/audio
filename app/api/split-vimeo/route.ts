
import {
  audioFileToBlob,
  convertToMp3,
  createTranscription,
  deleteAudios,
  download,
  processChunk,
} from "@/utils/audioHelpers";

export const POST = async (request: Request) => {
  const { url } = await request.json();
  const videoId = url.match(/\d+/g);
  const configLink = `https://player.vimeo.com/video/${videoId[0]}/config`;

  let filePaths: string[] = [];
  try {
    const youtubeVidId = download(url);
    // console.log({ youtubeVidId });
    const audioPath = await convertToMp3(youtubeVidId, "ytAudio.mp3");
    // console.log({ audioPath });
    const audioBlob = await audioFileToBlob(audioPath);
    // console.log({ audioBlob });

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
