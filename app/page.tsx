"use client";
import StreamTest from "@/components/StreamTest";
import srtParser2 from "srt-parser-2";
import Image from "next/image";
import { useState } from "react";
import { FieldValues, SubmitHandler, set, useForm } from "react-hook-form";
import { ImArrowRight } from "react-icons/im";
import Subtitle from "@/components/Subtitle";

type SRTItem = {
  id: string;
  startTime: string;
  startSeconds: number;
  endTime: string;
  endSeconds: number;
  text: string;
};

export default function Home() {
  const [transcription, setTranscription] = useState<SRTItem[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const parser = new srtParser2();

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    console.log({ data: data.audio });
    try {
      const formData = new FormData();
      formData.append("audio", data.audio[0]); // 'audio' debe coincidir con el nombre del campo en el backend

      const response = await fetch("/api/stream", {
        method: "POST",
        body: formData,
      });

      if (!response.body) {
        console.log("Response has no body");
        return;
      }

      const reader = response.body.getReader();
      // let accumulatedTranscription: SRTItem[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream has ended");
          break;
        }

        const text = new TextDecoder().decode(value);
        const srt_array = parser.fromSrt(text);

        setTranscription((prev) => [...prev, ...srt_array]);
      }
    } catch (error) {
      console.log({ error });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex items-center justify-around  w-screen">
        {/* <YoutubeConvert /> */}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex justify-between items-center gap-3"
        >
          <input
            type="file"
            className="file-input file-input-bordered file-input-accent w-full max-w-xs text-black"
            {...register("audio", {
              required: "Por favor selecciona un archivo de audio",
            })}
            accept="audio/*"
          />
          <button className="btn btn-outline btn-accent" type="submit">
            <ImArrowRight size={20} />
          </button>
        </form>
      </div>
      <div className="flex flex-col items-center justify-center w-full overflow-y-auto">
        {transcription ? (
          transcription.map((item, i) => <Subtitle key={i} {...item} />)
        ) : (
          <p>No hay transcripcion</p>
        )}
      </div>
    </main>
  );
}
