// LinkedIn Post Planner — turns one piece (an article, a ruling, a deal)
// into a week of posts. Aimed at the Social pillar: consistent, useful
// posting from named lawyers, not generic firm-page announcements.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

Deno.serve(handleWritingTool({
  toolId: "linkedin",
  memoryQuery: (b) => field(b.source, 400),
  maxTokens: 4500,
  build: (b) => {
    const days = Math.min(7, Math.max(3, Number(b.days) || 5));
    const poster = field(b.poster, 60) || "A named partner (personal profile)";
    const system = `You are a LinkedIn editor for lawyers. You know that posts from named lawyers beat firm-page posts, that the first two lines decide whether anyone reads on, and that lawyers who post consistently and usefully win work.

Turn the source material into a ${days}-day posting plan for: ${poster}.

For each day (markdown, "### Day N — [post type]"):
- Post type, varied across the week (e.g. sharp insight, "what most people get wrong", short story from practice with no client identified, a question to the audience, a practical checklist, a plain-English take on the news, a carousel outline).
- The full post, ready to paste: a hook in the first two lines that earns the "see more" click; short paragraphs; one idea per post; no more than 1,300 characters unless it is a carousel.
- A "First comment" line (a useful addition or link to the full article, since links in the post body suppress reach).
- 0–3 hashtags, only if genuinely relevant. No hashtag stuffing.

Then add:
- "## Carousel outline" — one post idea as 6–8 slides (slide title + one line each).
- "## Posting notes" — who should post which day (named lawyer vs firm page), a simple rhythm (e.g. weekdays, morning), and how to reply to comments in the first hour.
- "## Check before posting" — confidentiality and advertising-rule checks for each post.

Never sound like a press release. Write the way a sharp, helpful lawyer talks to a client over coffee.`;
    const user = [
      `Source material:\n${field(b.source, 8000)}`,
      b.audience ? `Audience: ${field(b.audience, 300)}` : "",
      b.goal ? `Goal: ${field(b.goal, 300)}` : "",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
