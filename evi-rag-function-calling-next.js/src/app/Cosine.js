"use server";

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const collection = "prana";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function Cosine(data) {
  console.log("Cosine function called with data:", data);
  try {
    const { userText } = data;
    console.log("User text:", userText);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: userText,
    });
    console.log("Embedding response:", embeddingResponse);

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log("Query embedding:", queryEmbedding);

    // Perform similarity search using Qdrant
    const results = await client.search(collection, {
      vector: queryEmbedding,
      limit: 3,
    });
    console.log("Search results:", results);

    const responseData = results.map(
      (obj, i) => `${(i + 1).toString()}. ${obj.payload.page_content}`
    );
    console.log("Response data:", responseData);

    return (
      "Below are the top ten paragraphs from the podcast data:\n\n" +
      responseData.join("\n\n")
    );
  } catch (error) {
    console.error("Error in Cosine function:", error);
    return {
      error: "An error occurred during similarity search.",
    };
  }
}
