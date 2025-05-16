import { AssistantMessage, UserMessage } from "hume/api/resources/empathicVoice";

/**
 * Extracts and returns the top three emotion scores from a prosody analysis.
 *
 * This function pulls the `scores` object out of the `message.models.prosody`
 * (if available), converts it into an array of `[emotion, numericScore]` entries,
 * sorts that array in descending order by score, and then returns the top three
 * as objects with the emotion name and a stringified score (two decimal places).
 *
 * @param message A `UserMessage` or `AssistantMessage` containing `models.prosody.scores`
 *                where keys are emotion labels and values are numeric scores.
 * @returns An array of up to three `{ emotion, score }` objects, sorted by highest score first.
 *          The `score` property is formatted as a string with exactly two decimal places.
 */
function extractTopThreeEmotions(
  message: UserMessage | AssistantMessage
): { emotion: string; score: string }[] {
  const scores = message.models.prosody?.scores;
  const scoresArray = Object.entries(scores || {});

  scoresArray.sort((a, b) => b[1] - a[1]);

  const topThreeEmotions = scoresArray.slice(0, 3).map(([emotion, score]) => ({
    emotion,
    score: Number(score).toFixed(2),
  }));

  return topThreeEmotions;
}

/**
 * Appends a chat message bubble to the container and scrolls to show it.
 *
 * @param container - The element that holds chat messages.
 * @param msg       - A UserMessage or AssistantMessage with content and emotion scores.
 */
export function appendChatMessage(
  container: HTMLElement | null,
  msg: UserMessage | AssistantMessage
): void {
  if (!container || !msg) return;

  const { role, content } = msg.message;
  const timestamp = new Date().toLocaleTimeString();

  const card = document.createElement("div");
  card.className = `chat-card ${role}`;

  card.innerHTML = `
  <div class="role">${role[0].toUpperCase() + role.slice(1)}</div>
  <div class="timestamp"><strong>${timestamp}</strong></div>
  <div class="content">${content}</div>
  `;

  const scoresEl = document.createElement("div");
  scoresEl.className = "scores";

  const topEmotions = extractTopThreeEmotions(msg);
  topEmotions.forEach(({ emotion, score }) => {
    const item = document.createElement("div");
    item.className = "score-item";
    item.innerHTML = `${emotion}: <strong>${score}</strong>`;
    scoresEl.appendChild(item);
  });

  card.appendChild(scoresEl);
  container.appendChild(card);

  container.scrollTop = container.scrollHeight;
}
