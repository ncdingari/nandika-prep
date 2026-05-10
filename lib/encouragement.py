import random

TELUGU_CHEERS = [
    "Bagundi! (Good!)",
    "Bhale Nandika! (Excellent!)",
    "Chakkani paniki! (Nice work!)",
    "Chala bagundi! (Very good!)",
    "Adirindi Nandika! (Amazing!)",
    "Inka munduku! (Keep going forward!)",
    "Mee ammayi chala telivaina! (This girl is so smart!)",
    "Shabaash Nandika! (Well done!)",
]

CHEERS = [
    "Yes! You spotted the pattern.",
    "Beautiful reasoning, Nandika.",
    "That is exactly right, your thinking is sharp.",
    "Smart deduction, just like that.",
    "You connected those ideas perfectly.",
    "Correct. You saw what others might miss.",
    "Right on. Your logic is clear.",
    "That reasoning is solid.",
    "Nandika, you are building serious thinking skills.",
    "Exactly. You held all the details at once.",
    "Superb. One more like that.",
    "Yes, your brain caught the rule.",
    "Precise. That is the word.",
    "You are getting faster and sharper.",
    "Keep going, your brain is building muscles.",
    "Every correct answer makes the next one easier.",
    "You spotted the relationship right away.",
    "That category thinking is strong.",
    "Flawless. On to the next one.",
    "You deduced that without any hints.",
    "Strong analytical instinct, Nandika.",
    "Faster than yesterday, Nandika. Beautiful.",
    "Brilliant. Your pattern recognition is growing.",
    "The hard ones felt easier today, yes?",
    "You worked through that smoothly.",
    "Your restatement caught the main idea perfectly.",
    "Strong reasoning across the whole passage.",
] + TELUGU_CHEERS

KUMON_CHEERS = [
    "Faster than yesterday, Nandika. Beautiful.",
    "Every problem correct. Shabaash! (Well done!)",
    "You worked through that multiplication smoothly.",
    "Your restatement caught the main idea perfectly.",
    "Strong reasoning across the whole passage.",
    "Keep going, your brain is building muscles.",
    "You are getting smoother. The hard ones felt easier today.",
    "Every long division correct. Shabaash! (Well done!)",
    "That fraction reduction was clean.",
    "You identified the topic and the main idea. Both. Impressive.",
] + TELUGU_CHEERS[:4]

WRONG_INTRO = "Let's look at this one together."

OFFLINE_TEMPLATE = (
    "Let's look at this one together. {explanation} "
    "Try one more like this tomorrow, you will get it."
)


def get_cheer(rng: random.Random | None = None) -> str:
    pool = rng or random
    return pool.choice(CHEERS)


def get_kumon_cheer(rng: random.Random | None = None) -> str:
    pool = rng or random
    return pool.choice(KUMON_CHEERS)


def static_explain(question: dict) -> str:
    explanation = question.get("explanation", "Think about the relationship between the pieces.")
    if explanation.startswith(WRONG_INTRO):
        return explanation
    return OFFLINE_TEMPLATE.format(explanation=explanation)
