# Research Agent

A small TypeScript CLI that uses OpenAI to decide what to research and Tavily
to search the web. Each run writes a readable trace to `logs/`.

## How the loop works

```text
User question
      ↓
OpenAI decides whether it needs web research
      ├─ No  → final answer
      └─ Yes → Tavily search
                    ↓
              Add results to the conversation
                    ↓
              Start the next iteration
```

The agent runs up to three research iterations, with at most one Tavily search
per iteration. If all three request a search, one final OpenAI call is made with
tools disabled to produce the answer.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
```

Create a `.env` file containing:

```dotenv
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Then run:

```bash
npm run agent -- "your research question"
```

## Custom thinking

Optionally provide up to three expert questions in a JSON file:

```json
{
  "questions": [
    "What are the operational constraints?",
    "What commonly fails in production?"
  ]
}
```

Run with:

```bash
npm run agent -- --thinking ./thinking.json "your research question"
```

Each question guides its matching research iteration. If fewer than three are
provided, the remaining iterations are adaptive and OpenAI decides what to
investigate next. Guided iterations always perform a Tavily search. The final
answer call is unchanged.
