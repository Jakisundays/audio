"use client";
import { FieldValues, SubmitHandler, set, useForm } from "react-hook-form";
import { IoPlay } from "react-icons/io5";
import srtParser2 from "srt-parser-2";

type Props = {
  setState: React.Dispatch<React.SetStateAction<any>>;
};

const YoutubeConvert = ({ setState }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      url: "https://www.youtube.com/watch?v=S2-bjGkcaJI&ab_channel=DanielRodrigues",
    },
  });

  const parser = new srtParser2();

  const onYoutubeSubmit: SubmitHandler<FieldValues> = async (data) => {
    console.log({ data: data.url });
    try {
      const response = await fetch("/api/split-youtube", {
        method: "POST",
        body: JSON.stringify({ url: data.url }),
      });
      // const result = await response.json();
      if (!response.body) {
        console.log("Response has no body");
        return;
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream has ended");
          break;
        }

        // Decode the received data and parse it as SRT subtitles
        const text = new TextDecoder().decode(value);
        const srt_array = parser.fromSrt(text);
        setState((prev: any) => [...prev, ...srt_array]);
      }
    } catch (error) {
      console.log({ error });
    }
  };
  return (
    <div className="mockup-window border bg-black w-72">
      <form
        onSubmit={handleSubmit(onYoutubeSubmit)}
        className="flex flex-col justify-around items-center gap-3 px-5 py-10 bg-red-700"
      >
        Youtube Video Link
        <input
          type="text"
          placeholder="www.youtube.com/watch?v=SLM0S1rC0cE&ab_channel=MartínP."
          className="input input-bordered input-sm w-full max-w-xs text-black"
          {...register("url", {
            required: "Por favor selecciona un url de youtube",
          })}
        />
        <button className="btn btn-ghost" type="submit">
          <IoPlay size={20} />
        </button>
      </form>
    </div>
  );
};

export default YoutubeConvert;
