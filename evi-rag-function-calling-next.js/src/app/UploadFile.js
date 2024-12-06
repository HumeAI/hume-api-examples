"use server";

import { promises as fs } from "fs";
import path from "path";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared/index.js";
import os from "os";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const collectionName = "prana";
const VECTOR_SIZE = 3072;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const unstructuredClient = new UnstructuredClient({
  security: {
    apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
  },
});

async function ensureCollectionExists() {
  try {
    const collections = await client.getCollections();
    const collectionExists = collections.collections.some(
      (collection) => collection.name === collectionName
    );

    if (!collectionExists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
      console.log(`Collection ${collectionName} created successfully`);
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error);
    throw new Error("Failed to setup Qdrant collection");
  }
}

export async function uploadFile(file) {
  try {
    await ensureCollectionExists();

    const uploadDir = path.join(
      // process.cwd(), "src", "app",
      os.tmpdir(),
      "uploads"
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const fileData = await fs.readFile(filePath);

    const response = await unstructuredClient.general.partition({
      partitionParameters: {
        files: {
          content: fileData,
          fileName: file.name,
        },
        strategy: Strategy.Auto,
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to process document: ${response.statusCode}`);
    }

    const points = [];

    for (const element of response.elements) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: element.text,
        });

        const embedding = embeddingResponse.data[0].embedding;

        if (embedding.length !== VECTOR_SIZE) {
          console.error(`Invalid embedding size: ${embedding.length}`);
          continue;
        }

        points.push({
          id: crypto.randomUUID(),
          vector: embedding,
          payload: {
            content: element.text,
            metadata: {
              type: element.type,
              fileName: file.name,
            },
          },
        });
      } catch (error) {
        console.error("Error creating embedding:", error);
      }
    }

    if (points.length > 0) {
      await client.upsert(collectionName, {
        wait: true,
        points: points,
      });
      console.log(`Successfully upserted ${points.length} points`);
    }

    return {
      success: true,
      filePath,
      message: `Successfully processed ${points.length} elements`,
    };
  } catch (error) {
    console.error("Error in uploadFile:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
