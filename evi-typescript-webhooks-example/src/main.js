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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("./util");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 5000;
app.use((req, res, next) => {
    if (req.originalUrl === "/hume-webhook") {
        next();
    }
    else {
        express_1.default.json()(req, res, next);
    }
});
app.post("/hume-webhook", 
// Stripe requires the raw body to construct the event
express_1.default.raw({ type: "application/json" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, util_1.validateHmacSignature)(req.body, req.headers);
    (0, util_1.validateTimestamp)(req.headers);
    const event = JSON.parse(req.body);
    try {
        if (event.eventName === "chat_started") {
            console.log("Processing chat_started event:", event);
            // Add your logic for handling chat_started events here
        }
        else if (event.eventName === "chat_ended") {
            console.log("Processing chat_ended event:", event);
            yield (0, util_1.getChatTranscript)(event.chatId);
            // Add your your logic for handling chat_ended events here
        }
        else {
            res.status(400).json({ error: "Unsupported event type" });
            return;
        }
        res.json({ status: "success", message: `${event.eventName} processed` });
    }
    catch (error) {
        console.error("Error processing event:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
