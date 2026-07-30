export function normalizeConversationText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isAssistantEcho(assistant, user) {
  const normalizedAssistant = normalizeConversationText(assistant);
  const normalizedUser = normalizeConversationText(user);

  return Boolean(
    normalizedAssistant &&
      normalizedUser &&
      (normalizedAssistant === normalizedUser ||
        normalizedAssistant.startsWith(`${normalizedUser} `)),
  );
}

export function isPotentialAssistantEcho(assistant, user) {
  const normalizedAssistant = normalizeConversationText(assistant);
  const normalizedUser = normalizeConversationText(user);

  return Boolean(
    normalizedAssistant &&
      normalizedUser &&
      (normalizedUser.startsWith(normalizedAssistant) ||
        normalizedAssistant.startsWith(normalizedUser)),
  );
}
