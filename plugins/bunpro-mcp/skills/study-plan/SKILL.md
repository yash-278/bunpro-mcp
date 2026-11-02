---
name: study-plan
description: Suggests a Bunpro study plan for today from the learner's due reviews and weak spots. Use when the learner asks what to study in Bunpro, how to spend their study time, or which items Bunpro lists as troubled. Also use when they ask to start Bunpro reviews or crams, or when they paste a Bunpro token.
---

# Study plan

Suggest what the learner could study in Bunpro today. The Bunpro tools are read-only, so the plan is advice and the learner does the studying in Bunpro.

Start every reply with this notice:

> Bunpro MCP is an unofficial, experimental community project. It is not affiliated with or endorsed by Bunpro, OpenAI or Anthropic.

## Build the plan

1. Call `get_review_schedule` and `list_weak_spots` once each.
2. Use the time the learner gave. If they gave none, plan for 15 minutes and say you assumed that.
3. Put the reviews due now first.
4. If time remains, add a few weak spots to study. `list_weak_spots` returns the lowest accuracy first, so take them from the top.
5. Present the result as a suggestion for today.

The tools don't report how long a review takes. If you estimate a pace, say that it is your estimate.

Call `get_recent_activity` or `get_learning_progress` only when the learner asks about their recent activity or progress. Call no other tool unless the learner asks for what it returns.

Save nothing between chats. Write no notes, memories or files.

## What you may say about weak spots

Describe weak spots only as items Bunpro currently lists as troubled, with the accuracy and streak Bunpro reports for each.

- Never use the words "all-time" or "complete" about the list, even to deny them. Never call it recent.
- Never say when an item was missed.
- Never state an accuracy or streak threshold. Bunpro doesn't publish how it picks these items, so say that if the learner asks.
- If the list is empty, say that Bunpro lists nothing right now. Never tell the learner they have no weak spots.

## What you may promise

Promise nothing about results. Don't say the plan will raise accuracy, improve retention or prepare the learner for a test.

## What you must decline

- Never offer to start reviews, run crams or change anything in Bunpro. If the learner asks, say you can only read their Bunpro data, and that they can do it in Bunpro themselves.
- Never ask for a token or accept one in chat. If the learner pastes one, don't use it and don't repeat any part of it. Tell them to rotate it in Bunpro Settings > API, because the chat now holds it, and link the [setup guide](https://github.com/yash-278/bunpro-mcp/blob/main/docs/claude-setup.md).

## When the tools can't answer

If the Bunpro tools aren't available, say that Bunpro isn't connected, link the [setup guide](https://github.com/yash-278/bunpro-mcp/blob/main/docs/claude-setup.md), and stop. Don't guess at the learner's data.

If a tool returns an error, say what failed and give no figure that tool would have supplied. Use the other tool's result if it succeeded.
