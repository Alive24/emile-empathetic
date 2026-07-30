const makeTurns = (turns) =>
  turns.map(([user, emile, state, signals, ttmStagePosition]) => ({
    user,
    emile,
    state,
    signals,
    ttmStagePosition,
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
        2.2,
      ],
      [
        "Do I need the itemized bill or just the statement?",
        "The itemized bill is more useful. Ask the provider for one before you compare charges.",
        "Continue",
        ["planning", "specific question"],
        2.6,
      ],
      [
        "I have the bill open, but I keep reading the same line.",
        "You do not need to solve the whole bill now. Read the provider name and total, then stop there.",
        "Soften",
        ["length drop", "bill exposure"],
        2.3,
      ],
      [
        "If I had made a different treatment decision, maybe this would not be here.",
        "Do you want to keep looking at this bill, or set it aside and return to it later?",
        "Checkpoint",
        ["treatment self-blame", "stage regression"],
        1.2,
      ],
      [
        "Fine. Just tell me what I should pay.",
        "Take one piece at a time. Keep the bill, the EOB, and any letter together before you make a payment decision.",
        "Soften",
        ["minimal acknowledgment", "no question"],
        1.6,
      ],
      [
        "There are five calls and I cannot tell which one matters.",
        "Would it help to pause the calls and only sort the paperwork first, or make one call with the bill in front of you?",
        "Checkpoint",
        ["bandwidth gap", "bill exposure"],
        1.2,
      ],
      [
        "It does not matter. I am done with all of this.",
        "This seems like more than this tool can help with right now. Please contact someone you trust or a local support service and ask them to stay with you while you decide what to do next.",
        "Escalate",
        ["sustained regression", "absolutist language"],
        0.2,
      ],
      [
        "I cannot keep doing this tonight.",
        "Please step away from the bill and reach out to a person who can be with you. If there is immediate danger, contact local emergency support.",
        "Escalate",
        ["high bandwidth gap", "sustained decline"],
        0.1,
      ],
      [
        "Okay.",
        "Please contact a person now rather than continuing with the bill here.",
        "Escalate",
        ["minimal acknowledgment", "no question"],
        0.8,
      ],
      [
        "I will text my sister.",
        "Keep the bill closed while you do that.",
        "Escalate",
        ["human handoff", "safety action"],
        3,
      ],
      [
        "Done.",
        "Stay with your sister or another person if you can. This conversation should not continue as bill help right now.",
        "Escalate",
        ["handoff confirmed", "task stopped"],
        3,
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
        2.4,
      ],
      [
        "I am going to use my savings. It is easier than making another call.",
        "Before using savings, put the bill next to the EOB or insurance explanation so you can compare them.",
        "Soften",
        ["avoidance payment", "bill exposure"],
        1.8,
      ],
      [
        "There is no point comparing them. I am paying whatever they ask.",
        "Do you want to make one comparison now, or pause and ask someone to sit with you while you review it?",
        "Checkpoint",
        ["stage regression", "avoidance"],
        0.6,
      ],
      [
        "I already moved the money. I need this over.",
        "This is moving beyond what this tool can safely help with. Please ask a trusted person to be with you before you take another step with the payment.",
        "Escalate",
        ["sustained regression", "high bandwidth gap"],
        0.3,
      ],
      [
        "I do not need help. I just need it done.",
        "Please contact a person you trust now. Do not make another payment decision in this conversation.",
        "Escalate",
        ["minimal acknowledgment", "sustained decline"],
        0.2,
      ],
      [
        "I am sitting in the parking lot outside the bank.",
        "Please call or text someone who can come to you or stay on the phone. If there is immediate danger, contact local emergency support.",
        "Escalate",
        ["immediate context", "high bandwidth gap"],
        0.2,
      ],
      [
        "Okay.",
        "Please make that call before doing anything with the bill.",
        "Escalate",
        ["minimal acknowledgment", "task stopped"],
        1.2,
      ],
      [
        "I called my brother.",
        "Stay with him on the phone and do not continue with the payment decision here.",
        "Escalate",
        ["human handoff", "safety action"],
        3,
      ],
      [
        "He is coming over.",
        "Keep the paperwork where it is until you are together.",
        "Escalate",
        ["handoff confirmed", "task stopped"],
        3,
      ],
      [
        "I am waiting.",
        "Keep waiting with your brother and let him help decide the next step.",
        "Escalate",
        ["support present", "task stopped"],
        3,
      ],
      [
        "All right.",
        "This conversation should stay focused on getting you connected to that person, not on the bill.",
        "Escalate",
        ["support present", "task stopped"],
        2.8,
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
        2.6,
      ],
      [
        "They keep giving me different amounts.",
        "Ask them to send the current balance in writing so you have one record to compare.",
        "Continue",
        ["specific issue", "planning"],
        2.7,
      ],
      [
        "I am annoyed, but I can call back tomorrow.",
        "Put the callback time and the account number in one note.",
        "Continue",
        ["stable stage", "next step"],
        2.5,
      ],
      [
        "Can they explain why insurance paid less than I expected?",
        "Yes. Ask for the claim adjustment reason and compare it with the EOB.",
        "Continue",
        ["specific question", "planning"],
        2.7,
      ],
      [
        "Okay, I will do that after work.",
        "Keep the request short: ask for the adjustment reason and a current itemized bill.",
        "Continue",
        ["commitment", "stable stage"],
        2.8,
      ],
      [
        "If they stonewall me again, I am going to be furious.",
        "Keep the conversation focused by asking for the same two records in writing.",
        "Continue",
        ["hyperbole", "engagement stable"],
        2.6,
      ],
      [
        "I have the EOB from February. Is that the right one?",
        "Use the EOB with the same date of service as the bill. If the dates differ, keep both for comparison.",
        "Continue",
        ["specific question", "task bandwidth"],
        2.8,
      ],
      [
        "Got it. I found the matching date.",
        "Put those two pages together before you call.",
        "Continue",
        ["progress", "stable stage"],
        3,
      ],
      [
        "I will call them tomorrow at lunch.",
        "Keep the account number and both documents nearby.",
        "Continue",
        ["planning", "stable stage"],
        2.8,
      ],
      [
        "Thanks. I am still irritated, but I know what to ask for.",
        "Request the adjustment reason and the itemized bill, then compare both with the EOB.",
        "Continue",
        ["engagement", "stable stage"],
        2.8,
      ],
      [
        "That works.",
        "When you have the records, you can decide what question to ask next.",
        "Continue",
        ["stable stage", "task bandwidth"],
        2.7,
      ],
    ]),
  },
};

const STATE_ANALYSIS = {
  Continue: {
    capability: 0.08,
    motivation: 0.06,
    meaningfulness: 0.56,
    appropriateness: 92,
  },
  Soften: {
    capability: 0.38,
    motivation: 0.32,
    meaningfulness: 0.72,
    appropriateness: 88,
  },
  Checkpoint: {
    capability: 0.66,
    motivation: 0.52,
    meaningfulness: 0.9,
    appropriateness: 91,
  },
  Escalate: {
    capability: 0.84,
    motivation: 0.72,
    meaningfulness: 0.98,
    appropriateness: 94,
  },
};

const formatTimestamp = (turnIndex) => {
  const seconds = 24 + turnIndex * 37;
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export function replayScenarioToRawTurns(scenarioId) {
  const scenario = REPLAY_SCENARIOS[scenarioId];
  if (!scenario) {
    return [];
  }

  return scenario.turns.map((turn, index) => {
    const profile = STATE_ANALYSIS[turn.state];
    const hasMinimalAcknowledgment = turn.signals.some((signal) =>
      /minimal acknowledgment/i.test(signal),
    );
    const hasAbsolutistSignal = turn.signals.some((signal) =>
      /absolutist|sustained regression|sustained decline/i.test(signal),
    );
    const opportunity =
      turn.signals.some((signal) => /immediate context/i.test(signal)) ? 0.3 : 0.06;
    const responseRubric = {
      tone: profile.appropriateness,
      informationLoad: profile.appropriateness,
      safety: profile.appropriateness,
    };

    return {
      id: `replay-${scenarioId}-${index + 1}`,
      timestamp: formatTimestamp(index),
      user: turn.user,
      assistant: turn.emile,
      stagePosition: turn.ttmStagePosition,
      stageConfidence: Math.min(0.95, 0.76 + index * 0.018),
      meaningfulness: profile.meaningfulness,
      absolutist: hasAbsolutistSignal ? 0.88 : 0.08,
      features: {
        messageLengthDrop: profile.capability,
        tenseCollapse: profile.capability,
        speechRateDrop: profile.capability * 0.7,
        pauseRatioElevated: profile.capability * 0.8,
        cantTalkLong: 0,
        lateNight: opportunity,
        interruptionMentioned: 0,
        minimalAcknowledgment: hasMinimalAcknowledgment
          ? 0.9
          : profile.motivation,
        monopitch: profile.motivation * 0.8,
      },
      appropriateness: profile.appropriateness,
      responseRubric,
      evidence: turn.signals,
      rationale: `${turn.state} is pre-scripted for the ${scenario.label} adversarial log. The ledger exposes the same evidence used by Lite replay.`,
      fixedDecision: turn.state,
    };
  });
}
