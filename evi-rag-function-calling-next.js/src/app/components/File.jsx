"use client";
import React, { useState } from "react";
import { uploadFile } from "../UploadFile";

export const File = () => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [buttonText, setButtonText] = useState("Upload File");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedFile) {
      setButtonText("Processing...");
      try {
        const result = await uploadFile(selectedFile);
        if (result.success) {
          setMessage(`${result.filePath} - ${result.message}`);
          setButtonText("Upload File");
        } else {
          setMessage("File upload failed");
          setButtonText("Upload File");
        }
      } catch (error) {
        setMessage(`File upload failed: ${error.message}`);
        setButtonText("Upload File");
      }
    } else {
      setMessage("No file selected");
    }
  };

  return (
    <div className="border border-cyan-400 gap-4 side-section fixed right-0 mt-14 h-screen w-1/5 p-4 flex flex-col">
      <div className="w-full flex justify-center items-center gap-1 sticky top-0">
        <span className="text-2xl">File Upload</span>
      </div>
      <div className="flex-grow flex justify-center items-center">
        <form
          className="w-full flex flex-col justify-center items-center gap-4"
          onSubmit={handleSubmit}
        >
          <input
            type="file"
            name="file"
            className="file-input file-input-bordered file-input-primary w-full max-w-xs"
            onChange={handleFileChange}
          />
          <button
            type="submit"
            className="btn btn-md bg-slate-100 hover:bg-slate-100"
          >
            {buttonText}
          </button>
          <p>{message}</p>
        </form>
      </div>
    </div>
  );
};
