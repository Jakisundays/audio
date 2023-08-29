"use client";

// Import required dependencies and components
import srtParser2 from "srt-parser-2"; // Import SRT subtitle parsing library
import { useState } from "react"; // Import the useState hook from React
import { FieldValues, SubmitHandler, set, useForm } from "react-hook-form"; // Import form handling hooks from react-hook-form library
import { ImArrowRight } from "react-icons/im"; // Import arrow right icon from react-icons
import Subtitle from "@/components/Subtitle"; // Import Subtitle component
import YoutubeConvert from "@/components/YoutubeConvert";
import VidToAudio from "@/components/VidToAudio";

// Define the type for each SRT subtitle item
type SRTItem = {
  id: string;
  startTime: string;
  startSeconds: number;
  endTime: string;
  endSeconds: number;
  text: string;
};

// Define the main functional component for the Home page
export default function Home() {
  // State to store the transcription data
  const [transcription, setTranscription] = useState<SRTItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form handling using react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Create an instance of the SRT parser
  const parser = new srtParser2();

  // Define the form submission handler
  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    console.log("🚀 Starting transcription process...");
    setLoading(true);
    try {
      // Create a FormData object to send the audio file to the backend
      const formData = new FormData();
      formData.append("audio", data.audio[0]); // 'audio' should match the backend's expected field name

      // Send a POST request to the /api/stream endpoint with the audio data
      const response = await fetch("/api/stream", {
        method: "POST",
        body: formData,
      });

      setLoading(false);

      // Check if the response has a body
      if (!response.body) {
        console.log("Response has no body");
        return;
      }

      // Create a reader to read the streamed response data
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
        setTranscription((prev) => [...prev, ...srt_array]);
      }
    } catch (error) {
      console.log({ error });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 w-screen h-screen p-8">
        <h2>Loading transcription data...</h2>
        <span className="loading loading-spinner text-primary loading-lg"></span>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* Form for uploading the audio file */}
      <div className="flex items-center justify-around w-screen">
        <VidToAudio setState={setTranscription} setLoading={setLoading} />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex justify-between items-center gap-3"
        >
          {/* Input for selecting an audio file */}
          <input
            type="file"
            className="file-input file-input-bordered file-input-accent w-full max-w-xs text-black"
            {...register("audio", {
              required: "Por favor selecciona un archivo de audio", // Validation message for required field
            })}
            accept="audio/*"
          />
          {/* Submit button */}
          <button className="btn btn-outline btn-accent" type="submit">
            <ImArrowRight size={20} />
          </button>
        </form>
        <YoutubeConvert setState={setTranscription} setLoading={setLoading} />
      </div>

      {/* Display the transcribed subtitles */}
      <div className="flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto">
        {/* Display subtitles if available, otherwise show a message */}
        {transcription ? (
          transcription.map((item, i) => <Subtitle key={i} {...item} />)
        ) : (
          <p>No hay transcripcion</p>
        )}
      </div>
    </main>
  );
}
