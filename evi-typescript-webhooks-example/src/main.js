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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("Hello world");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const hume_1 = require("hume");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 3000;
// Initialize Hume Client
const humeClient = new hume_1.HumeClient({ apiKey: process.env.HUME_API_KEY });
app.use(express_1.default.json());
// 1. Listen on Port 3000 /evi/webhooks
app.post('/evi/webhooks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 2. Receive a Webhook event from evi when a chat ends
        const event = req.body;
        // 3. Parse the event and get the chat id
        const chatId = event.chat_id;
        // 4. Look up the chat from the Hume API and print the last three messages
        const chat = yield humeClient.empathicVoice.chats.listChatEvents(chatId);
        console.log(chat);
        // const messages = chat.messages;
        // // Print the last three messages
        // const lastThreeMessages = messages.slice(-3);
        // lastThreeMessages.forEach(message => {
        //   console.log(message);
        // });
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
