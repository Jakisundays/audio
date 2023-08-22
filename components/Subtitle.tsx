import React from "react";

interface SubtitleData {
  id: string;
  startTime: string;
  startSeconds: number;
  endTime: string;
  endSeconds: number;
  text: string;
}

const Subtitle = ({
  id,
  startTime,
  startSeconds,
  endTime,
  endSeconds,
  text,
}: SubtitleData) => {
  return (
    <div className="border p-4 m-2">
      <div className="text-lg font-bold">ID: {id}</div>
      <div>Start Time: {startTime}</div>
      <div>Start Seconds: {startSeconds}</div>
      <div>End Time: {endTime}</div>
      <div>End Seconds: {endSeconds}</div>
      <div className="mt-2">{text}</div>
    </div>
  );
};

export default Subtitle;
