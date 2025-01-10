"use strict";
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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const hume_1 = require("hume");
const promises_1 = __importDefault(require("fs/promises"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 3000;
// Initialize Hume Client
const humeClient = new hume_1.HumeClient({ apiKey: process.env.HUME_API_KEY });
app.use(express_1.default.json());
const handleChatStartedEvent = (event) => __awaiter(void 0, void 0, void 0, function* () {
    let label = "New";
    if (event.chat_start_type === 'resumed') {
        label = "Resumed";
    }
    console.log(`${label} chat ${event.chat_id} started at ${event.start_time}`);
});
function fetchAllChatEvents(chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const allChatEvents = [];
        const chatEventsIterator = yield humeClient.empathicVoice.chats.listChatEvents(chatId, {
            pageNumber: 0,
        });
        try {
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
function generateTranscript(chatEvents) {
    const relevantChatEvents = chatEvents.filter((chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE");
    const transcriptLines = relevantChatEvents.map((chatEvent) => {
        const role = chatEvent.role === "USER" ? "User" : "Assistant";
        const timestamp = new Date(chatEvent.timestamp).toLocaleString(); // Human-readable date/time
        return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
    });
    return transcriptLines.join("\n");
}
const handleChatEndedEvent = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = event.chat_id;
    const chatEvents = yield fetchAllChatEvents(chatId);
    console.log(`Chat ${event.chat_id} ended at ${event.end_time}`);
    // Generate a transcript string from the fetched chat events
    const transcript = generateTranscript(chatEvents);
    // Define the transcript file name
    const transcriptFileName = `transcript_${chatId}.txt`;
    // Write the transcript to a text file
    try {
        yield promises_1.default.writeFile(transcriptFileName, transcript, "utf8");
        console.log(`Transcript saved to ${transcriptFileName}`);
    }
    catch (fileError) {
        console.error(`Error writing to file ${transcriptFileName}:`, fileError);
    }
});
app.post('/evi/webhooks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = req.body;
        switch (event.type) {
            case 'chat_started':
                yield handleChatStartedEvent(event);
                break;
            case 'chat_ended':
                yield handleChatEndedEvent(event);
                break;
            default:
                console.log('Unsupported event type:', event.type);
        }
        res.status(200).send('Webhook received and processed');
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
}));
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
