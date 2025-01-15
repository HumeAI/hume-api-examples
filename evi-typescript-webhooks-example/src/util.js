"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatTranscript = getChatTranscript;
exports.validateHmacSignature = validateHmacSignature;
exports.validateTimestamp = validateTimestamp;
const hume_1 = require("hume");
const promises_1 = __importDefault(require("fs/promises"));
const crypto = __importStar(require("crypto"));
/**
 * Fetches all chat events for a given chat ID from the Hume API.
 *
 * This function utilizes the HumeClient to retrieve all chat events associated with the specified chat ID.
 * It internally handles pagination by iterating through all available pages until every event is retrieved.
 *
 * @param chatId The unique identifier of the chat for which to fetch events.
 * @returns A promise that resolves to an array of chat events.
 * @throws If the HUME_API_KEY environment variable is not set.
 */
function fetchAllChatEvents(chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const apiKey = process.env.HUME_API_KEY;
        if (!apiKey) {
            throw new Error("HUME_API_KEY is not set in the environment variables.");
        }
        const client = new hume_1.HumeClient({ apiKey });
        const allChatEvents = [];
        // Retrieve an async iterator over all chat events
        const chatEventsIterator = yield client.empathicVoice.chats.listChatEvents(chatId, {
            pageNumber: 0, // Start from the first page
        });
        try {
            // Collect all events from the iterator
            for (var _d = true, chatEventsIterator_1 = __asyncValues(chatEventsIterator), chatEventsIterator_1_1; chatEventsIterator_1_1 = yield chatEventsIterator_1.next(), _a = chatEventsIterator_1_1.done, !_a; _d = true) {
                _c = chatEventsIterator_1_1.value;
                _d = false;
                const chatEvent = _c;
                allChatEvents.push(chatEvent);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = chatEventsIterator_1.return)) yield _b.call(chatEventsIterator_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return allChatEvents;
    });
}
/**
 * Generates a formatted transcript string from user and assistant messages.
 *
 * This function filters chat events to include only user and assistant messages,
 * then formats each message with a timestamp and role.
 *
 * @param chatEvents An array of chat events to parse.
 * @returns A formatted transcript string.
 */
function generateTranscript(chatEvents) {
    // Filter events for user and assistant messages
    const relevantChatEvents = chatEvents.filter((chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE");
    // Map each relevant event to a formatted line
    const transcriptLines = relevantChatEvents.map((chatEvent) => {
        const role = chatEvent.role === "USER" ? "User" : "Assistant";
        const timestamp = new Date(chatEvent.timestamp).toLocaleString(); // Human-readable date/time
        return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
    });
    // Join all lines into a single transcript string
    return transcriptLines.join("\n");
}
function saveTranscriptToFile(transcript, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const transcriptFileName = `transcript_${chatId}.txt`;
        try {
            yield promises_1.default.writeFile(transcriptFileName, transcript, "utf8");
            console.log(`Transcript saved to ${transcriptFileName}`);
        }
        catch (fileError) {
            console.error(`Error writing to file ${transcriptFileName}:`, fileError);
        }
    });
}
function getChatTranscript(chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const chatEvents = yield fetchAllChatEvents(chatId);
        const transcript = generateTranscript(chatEvents);
        saveTranscriptToFile(transcript, chatId);
    });
}
function validateHmacSignature(payload, headers) {
    // 1. Retrieve the timestamp from headers
    const timestamp = headers["X-Hume-AI-Webhook-Timestamp"];
    if (!timestamp) {
        console.error("Error: Missing timestamp in the request headers.");
        throw new Error("Missing timestamp header");
    }
    // 1. (continued) Retrieve the signature from headers
    const signature = headers["X-Hume-AI-Webhook-Signature"];
    if (!signature) {
        console.error("Error: Missing signature in the request headers.");
        throw new Error("Missing signature header");
    }
    // 2. Retrieve the API key from environment variables
    const apiKey = process.env.HUME_API_KEY;
    if (!apiKey) {
        console.error("Error: HUME_API_KEY is not set in environment variables.");
        throw new Error("Missing API key");
    }
    // 3. Construct the message to be hashed by concatenating the payload and the timestamp
    const message = `${payload}.${timestamp}`;
    const expectedSig = crypto
        .createHmac("sha256", apiKey)
        .update(message)
        .digest("hex");
    // Debugging information: print out details of the validation
    console.log("Debugging HMAC Validation:");
    console.log("Payload:", payload);
    console.log("Timestamp:", timestamp);
    console.log("Generated Signature:", expectedSig);
    console.log("Received Signature:", signature);
    // 4. Compare the provided signature with the expected one using timing-safe comparison
    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedSigBuffer = Buffer.from(expectedSig, "utf8");
    const validSignature = signatureBuffer.length === expectedSigBuffer.length &&
        crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer);
    // 5. If the signatures do not match, throw an error
    if (!validSignature) {
        console.error(`Error: Invalid HMAC signature. Expected: ${expectedSig}, Received: ${signature}`);
        throw new Error("Invalid HMAC signature");
    }
    console.log("HMAC validation successful!");
}
function validateTimestamp(headers) {
    // 1. Retrieve the timestamp from the headers
    const timestamp = headers["X-Hume-AI-Webhook-Timestamp"];
    if (!timestamp) {
        console.error("Error: Missing timestamp.");
        throw new Error("Missing timestamp");
    }
    // 2. Attempt to parse the timestamp to a number
    let timestampInt;
    try {
        timestampInt = parseInt(timestamp, 10);
        if (isNaN(timestampInt)) {
            // parseInt can return NaN if the string isn't a valid integer
            throw new Error();
        }
    }
    catch (err) {
        console.error(`Error: Invalid timestamp format: ${timestamp}`);
        throw new Error("Invalid timestamp format");
    }
    // 3. Get the current time in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    // 4. Check if the timestamp is more than 180 seconds behind the current time
    if (currentTime - timestampInt > 180) {
        console.error(`Error: The timestamp on the request is too old. Current time: ${currentTime}, Timestamp: ${timestamp}`);
        throw new Error("The timestamp on the request is too old");
    }
    console.log("Timestamp validation successful!");
}
