"use client";

import { cp } from "fs";
import { useState } from "react";

const Summary = () => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const getSummary = async () => {
    console.log("iniciando");
    setLoading(true);
    const formData = new FormData();
    const text = `And the Grammy goes to The College Dropout, Kanye West. What'd I tell you? What'd I tell you? Y'all might as well get the music ready, because this is going to take a while. When I had my accident, I found out at that moment, nothing in life is promised except death. If you have the opportunity to play this game of life, you need to appreciate every moment. A lot of people don't appreciate their moment until it's passed. And then you gotta tell those Al Bundy stories. You remember when I... But, um, right now is my time and my moment, thanks to the fans, thanks to the accident, thanks to God, thanks to Rockefeller, Jay-Z, Dame Dash, G, my mother, Rhymefest, everyone that's helped me. And I plan, I plan to celebrate. I plan to celebrate and scream and pop champagne every chance I get, because I'm at the Grammys, baby! I know, I know, every, I know, everybody asks me the question. They want to know what kind, I know he's going to rile out, I know he's going to do something crazy. Everybody wants to know what I would do if I didn't win. I guess we'll never know. you`;
    // const convertedTranscription = convertSRTItemsToString(transcription);
    formData.append("text", text);
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        body: formData,
      });
      setLoading(false);

      const data = await response.json();
      console.log({ data });
      setSummary(data.text);
      //   if (!response.body) {
      //     console.log("Response has no body");
      //     return;
      //   }
      //   const reader = response.body.getReader();
      //   while (true) {
      //     const { done, value } = await reader.read();
      //     if (done) {
      //       console.log("Stream has ended");
      //       break;
      //     }
      //     const text = new TextDecoder().decode(value);
      //     setSummary(text);
      //   }
    } catch (error) {
      console.log({ error });
    }
  };
  return (
    <div className="flex flex-col gap-5 items-center justify-center h-screen w-screen">
      <button className="btn btn-primary" onClick={() => getSummary()}>
        {loading ? "Loading..." : "Get Summary"}
      </button>
      <div className="flex flex-col gap-5 items-center justify-center w-screen">
        {/* <h1 className="text-3xl font-bold">Summary</h1> */}
        <p className="text-xl font-bold">
          {summary ? summary : "No summary yet"}
        </p>
      </div>
    </div>
  );
};

export default Summary;
