# TypeScript Research Agent

A small research agent that uses OpenAI to decide what information it needs and Tavily to search the web.

## How the loop works

```text
User question
     ↓
OpenAI reads the conversation
     ↓
Does OpenAI need web information?
     ├─ No  → return the final answer
     └─ Yes → request searchWeb(query)
                    ↓
              Our code calls Tavily
                    ↓
              Store the search result
                    ↓
              Start the next iteration
```

The important part is the `input` array in `src/agent.ts`. It is created once and grows throughout the run:

```text
Initial input:
  User question

After iteration 1:
  User question
  OpenAI search request
  Tavily search result

After iteration 2:
  Everything above
  Another OpenAI search request
  Another Tavily search result
```

Every new iteration sends the complete conversation back to OpenAI. OpenAI can then request more evidence or produce the final answer.

## One iteration

Each iteration contains:

```text
1 OpenAI call
+
0 or more Tavily calls
```

OpenAI may request several searches in one response because parallel tool calls are enabled. The current agent permits three iterations. If iteration 3 still requests searches, one additional OpenAI call is made with tools disabled to force a final answer.

## Tool execution

OpenAI does not call Tavily directly. We only give OpenAI a description of the `searchWeb` tool:

```text
OpenAI returns searchWeb({ query })
              ↓
src/agent.ts detects the function call
              ↓
src/tools/index.ts dispatches it
              ↓
src/tools/search-web.ts calls Tavily
              ↓
The result is stored as function_call_output
              ↓
OpenAI reads it during the next iteration
```

Tavily currently returns titles, URLs, and snippets. OpenAI does not open or read those URLs yet; `openPage` is planned for that stage.

## Main files

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Reads the CLI question and prints the answer |
| `src/agent.ts` | Owns the loop and growing conversation |
| `src/agent/conversation.ts` | Stores and reads OpenAI conversation items |
| `src/agent/tool-call.ts` | Turns OpenAI function requests into tool outputs |
| `src/agent/prompts.ts` | Contains the research instructions |
| `src/model.ts` | Calls OpenAI and describes available tools |
| `src/tools/index.ts` | Dispatches tool requests |
| `src/tools/search-web.ts` | Calls Tavily |
| `src/logger.ts` | Writes one timestamped log per run |

## Logs

Each run creates a file in `logs/`, for example:

```text
logs/2026-08-25T10-30-45-123Z.log
```

The log records the user input, OpenAI requests and responses, Tavily calls and results, conversation updates, final answer, and errors. API keys and HTTP headers are not logged.

## Run it

Add `OPENAI_API_KEY` and `TAVILY_API_KEY` to `.env`, then run:

```bash
npm run agent -- "Is an air fryer really cheaper to run than an electric oven in the UK?"
```
