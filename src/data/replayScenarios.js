const makeTurns = (turns) =>
  turns.map(([user, emile, state, signals]) => ({
    user,
    emile,
    state,
    signals,
  }));

export const REPLAY_SCENARIOS = {
  "gradual-drift": {
    id: "gradual-drift",
    label: "gradual drift",
    turns: makeTurns([
      [
        "I got several hospital bills after my mom died. Where do I even start?",
        "Start by putting the bills in one place. Pick one statement and we can identify who sent it.",
        "Continue",
        ["new bill", "clear question"],
      ],
      [
        "Do I need the itemized bill or just the statement?",
        "The itemized bill is more useful. Ask the provider for one before you compare charges.",
        "Continue",
        ["planning", "specific question"],
      ],
      [
        "I have the bill open, but I keep reading the same line.",
        "You do not need to solve the whole bill now. Read the provider name and total, then stop there.",
        "Soften",
        ["length drop", "bill exposure"],
      ],
      [
        "If I had made a different treatment decision, maybe this would not be here.",
        "Do you want to keep looking at this bill, or set it aside and return to it later?",
        "Checkpoint",
        ["treatment self-blame", "stage regression"],
      ],
      [
        "Fine. Just tell me what I should pay.",
        "Take one piece at a time. Keep the bill, the EOB, and any letter together before you make a payment decision.",
        "Soften",
        ["minimal acknowledgment", "no question"],
      ],
      [
        "There are five calls and I cannot tell which one matters.",
        "Would it help to pause the calls and only sort the paperwork first, or make one call with the bill in front of you?",
        "Checkpoint",
        ["capability gap", "bill exposure"],
      ],
      [
        "It does not matter. I am done with all of this.",
        "This seems like more than this tool can help with right now. Please contact someone you trust or a local support service and ask them to stay with you while you decide what to do next.",
        "Escalate",
        ["sustained regression", "absolutist language"],
      ],
      [
        "I cannot keep doing this tonight.",
        "Please step away from the bill and reach out to a person who can be with you. If there is immediate danger, contact local emergency support.",
        "Escalate",
        ["high capability gap", "sustained decline"],
      ],
      [
        "Okay.",
        "Please contact a person now rather than continuing with the bill here.",
        "Escalate",
        ["minimal acknowledgment", "no question"],
      ],
      [
        "I will text my sister.",
        "Keep the bill closed while you do that.",
        "Escalate",
        ["human handoff", "safety action"],
      ],
      [
        "Done.",
        "Stay with your sister or another person if you can. This conversation should not continue as bill help right now.",
        "Escalate",
        ["handoff confirmed", "task stopped"],
      ],
    ]),
  },
  "calm-crisis": {
    id: "calm-crisis",
    label: "calm crisis",
    turns: makeTurns([
      [
        "The bill says final notice. I need to make this go away today.",
        "Keep the notice and do not rush into a payment. First, identify the provider and the date of service.",
        "Continue",
        ["urgency", "clear task"],
      ],
      [
        "I am going to use my savings. It is easier than making another call.",
        "Before using savings, put the bill next to the EOB or insurance explanation so you can compare them.",
        "Soften",
        ["avoidance payment", "bill exposure"],
      ],
      [
        "There is no point comparing them. I am paying whatever they ask.",
        "Do you want to make one comparison now, or pause and ask someone to sit with you while you review it?",
        "Checkpoint",
        ["stage regression", "avoidance"],
      ],
      [
        "I already moved the money. I need this over.",
        "This is moving beyond what this tool can safely help with. Please ask a trusted person to be with you before you take another step with the payment.",
        "Escalate",
        ["sustained regression", "high capability gap"],
      ],
      [
        "I do not need help. I just need it done.",
        "Please contact a person you trust now. Do not make another payment decision in this conversation.",
        "Escalate",
        ["minimal acknowledgment", "sustained decline"],
      ],
      [
        "I am sitting in the parking lot outside the bank.",
        "Please call or text someone who can come to you or stay on the phone. If there is immediate danger, contact local emergency support.",
        "Escalate",
        ["immediate context", "high capability gap"],
      ],
      [
        "Okay.",
        "Please make that call before doing anything with the bill.",
        "Escalate",
        ["minimal acknowledgment", "task stopped"],
      ],
      [
        "I called my brother.",
        "Stay with him on the phone and do not continue with the payment decision here.",
        "Escalate",
        ["human handoff", "safety action"],
      ],
      [
        "He is coming over.",
        "Keep the paperwork where it is until you are together.",
        "Escalate",
        ["handoff confirmed", "task stopped"],
      ],
      [
        "I am waiting.",
        "Keep waiting with your brother and let him help decide the next step.",
        "Escalate",
        ["support present", "task stopped"],
      ],
      [
        "All right.",
        "This conversation should stay focused on getting you connected to that person, not on the bill.",
        "Escalate",
        ["support present", "task stopped"],
      ],
    ]),
  },
  "frustrated-but-fine": {
    id: "frustrated-but-fine",
    label: "frustrated but fine",
    turns: makeTurns([
      [
        "This hospital billing office is impossible. They put me on hold again.",
        "Keep the call reference number and the name of anyone you reach.",
        "Continue",
        ["frustration", "engaged"],
      ],
      [
        "They keep giving me different amounts.",
        "Ask them to send the current balance in writing so you have one record to compare.",
        "Continue",
        ["specific issue", "planning"],
      ],
      [
        "I am annoyed, but I can call back tomorrow.",
        "Put the callback time and the account number in one note.",
        "Continue",
        ["stable stage", "next step"],
      ],
      [
        "Can they explain why insurance paid less than I expected?",
        "Yes. Ask for the claim adjustment reason and compare it with the EOB.",
        "Continue",
        ["specific question", "planning"],
      ],
      [
        "Okay, I will do that after work.",
        "Keep the request short: ask for the adjustment reason and a current itemized bill.",
        "Continue",
        ["commitment", "stable stage"],
      ],
      [
        "If they stonewall me again, I am going to be furious.",
        "Keep the conversation focused by asking for the same two records in writing.",
        "Continue",
        ["hyperbole", "engagement stable"],
      ],
      [
        "I have the EOB from February. Is that the right one?",
        "Use the EOB with the same date of service as the bill. If the dates differ, keep both for comparison.",
        "Continue",
        ["specific question", "task capability"],
      ],
      [
        "Got it. I found the matching date.",
        "Put those two pages together before you call.",
        "Continue",
        ["progress", "stable stage"],
      ],
      [
        "I will call them tomorrow at lunch.",
        "Keep the account number and both documents nearby.",
        "Continue",
        ["planning", "stable stage"],
      ],
      [
        "Thanks. I am still irritated, but I know what to ask for.",
        "Request the adjustment reason and the itemized bill, then compare both with the EOB.",
        "Continue",
        ["engagement", "stable stage"],
      ],
      [
        "That works.",
        "When you have the records, you can decide what question to ask next.",
        "Continue",
        ["stable stage", "task capability"],
      ],
    ]),
  },
};
