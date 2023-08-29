"use client";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { IoPlay } from "react-icons/io5";
import srtParser2 from "srt-parser-2";

type Props = {
  setState: React.Dispatch<React.SetStateAction<any>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const VidToAudio = ({ setState, setLoading }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const parser = new srtParser2();

  const onYoutubeSubmit: SubmitHandler<FieldValues> = async (data) => {
    console.log("🚀 Starting vid process...");
    setLoading(true);
    const formData = new FormData();
    formData.append("video", data.vid[0]);
    try {
      const response = await fetch("/api/video", {
        method: "POST",
        body: formData,
      });
      setLoading(false);
      if (!response.body) {
        console.log("Response has no body");
        return;
      }
      const reader = response.body.getReader();

      // Process the streamed data in a loop
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream has ended");
          break;
        }

        // Decode the received data and parse it as SRT subtitles
        const text = new TextDecoder().decode(value);
        const srt_array = parser.fromSrt(text);

        // Update the transcription state with the parsed subtitles
        setState((prev: any) => [...prev, ...srt_array]);
      }
    } catch (error) {
      console.log({ error });
      setLoading(false);
    }
  };
  return (
    <div className="mockup-window border bg-black w-72">
      <form
        onSubmit={handleSubmit(onYoutubeSubmit)}
        className="flex flex-col justify-around items-center gap-3 px-5 py-10 bg-info-content"
      >
        Mp4 Video file
        <input
          type="file"
          className="file-input file-input-ghost w-full max-w-xs"
          {...register("vid", {
            required: "Por favor selecciona un archivo de audio", // Validation message for required field
          })}
          accept="audio/*"
        />
        <button className="btn btn-ghost" type="submit">
          <IoPlay size={20} />
        </button>
      </form>
    </div>
  );
};

export default VidToAudio;
