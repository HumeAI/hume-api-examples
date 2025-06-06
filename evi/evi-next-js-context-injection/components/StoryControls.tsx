import { useVoice } from "@humeai/voice-react";
import React, { useState } from "react";

export default function StoryControls() {
  const { sendSessionSettings } = useVoice()
  const [characterName, setCharacterName] = useState("")
  const [genre, setGenre] = useState("mystery" as "fantasy" | "mystery" | "romance")
  const submitCharacterName = () => {
    sendSessionSettings({
      context: {
        type: "persistent",
        text: `The main character of the story is named ${characterName}`
      }
    })
  }
  const makeEviRhyme = () => {
    sendSessionSettings({
      context: {
        type: "temporary",
        text: "The user wants evi to RHYME in the next line of the story."
      }
    })
  }
  const switchGenre = (genre: string) => {
    sendSessionSettings({
      context: {
        type: "editable",
        text: `Generate the next part of the story as a story in the ${genre}`
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full flex-1 p-6 sm:p-8 lg:p-10">
      <h1 className="text-2xl font-bold mb-4">Story Controls</h1>
      <p className="text-lg mb-2">This is a placeholder for story controls.</p>
      <label>Character name</label> <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} className="border p-2 mb-4 w-full max-w-xs" /> <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      onClick={() => submitCharacterName()}>Set</button>
      <button 
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors mt-4"
        onClick={() => makeEviRhyme()}>
        Rhyme time
      </button>
      <div className="flex gap-4 mt-4">
        <button
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
          onClick={() => {
            switchGenre("fantasy");
          }}
        >
          Fantasy
        </button>
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
          onClick={() => {
            switchGenre("mystery");
          }}
        >
          Mystery
        </button>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          onClick={() => {
            switchGenre("romance");
          }}
        >
          Romance
        </button>
      </div>
    </div>
  );
}
