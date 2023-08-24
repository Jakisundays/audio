import { NextResponse } from "next/server";
import ytdl from "ytdl-core";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

export const POST = async (request: Request, res: NextResponse) => {
  const { url } = await request.json();
  console.log({ url });
  try {
    const response = await download(url);
    console.log({ response });
    const conversion = await convert(response);
    return "completo";
  } catch (error) {}
};

async function download(videoLink: string) {
  const videoId = ytdl.getURLVideoID(videoLink);
  const video = ytdl(videoId, { filter: "audioonly" });
  return video;
}

async function convert(stream: Readable) {
  Ffmpeg()
    .input(stream)
    .toFormat("mp3")
    .output("ytAudio.mp3")
    .on("end", () => console.log("Conversion successful"))
    .on("error", (err) => {
      console.error("Error with ffmpeg", err);
      throw err;
    })
    .run();

  return "Success!";
}
