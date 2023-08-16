"use client";
import Image from "next/image";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { ImArrowRight } from "react-icons/im";

export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    console.log({ data: data.audio });
    try {
      const formData = new FormData();
      formData.append("audio", data.audio[0]); // 'audio' debe coincidir con el nombre del campo en el backend

      const response = await fetch("/api/split-and-convert", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log({ result: result });
    } catch (error) {
      console.log({ error });
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
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
    </main>
  );
}
