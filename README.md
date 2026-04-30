# Out-Of-Context

**ONE WORD. FIVE PLAYERS. ONE DOESN'T KNOW IT.**

OutOfContext is a real-time multiplayer social deduction game where players must guess who the Imposter is among them. Four "Crewmates" are given a shared secret word, while one "Imposter" is left in the dark. Through turn-based proxy word hints and an open discussion phase, players must bluff, deduce, and vote to survive.

## Team
Developed by Ziyan, Anand, Meera, Rajwol, and Wai.

## Tech Stack
* **Frontend:** React.js
* **Backend:** Django (Python 3.11), containerized with Docker
* **Database & Real-time:** Supabase (PostgreSQL, Real-time channels)
* **AI Integration:** OpenAI `gpt-5.4` (via AI Gateway)

## Key Features
* **5-Player Lobbies:** Play with human friends or autonomous AI bots.
* **Dynamic Game Phases:** Automated progression through Waiting, Chatting, Discussion (60s), and Voting (30s) phases.
* **LLM-Powered Bots:** AI players use specialized prompts to deduce words, defend themselves in chat, and cast strategic votes.
* **Real-Time Synchronization:** Instant updates to chat, lobbies, and game state using Supabase WebSockets.
* **Trust Meter:** A private, locally-stored suspicion slider allowing players to track their trust levels for opponents.
* **Cinematic UI:** Immersive space-themed interface with floating animations and a dramatic voting ejection sequence.

## Algorithm Design

### Basic Gameplay Algorithm
The core gameplay loop is synchronized across all clients using a state-machine approach driven by the backend:
1. **Initialization:** Upon 5 players joining the lobby, the game transitions to an "active" state. Roles (4 Crewmates, 1 Imposter) are assigned, a shared secret word is selected (hidden from the Imposter), and a randomized turn order is generated.
2. **Turn-Based Hinting (Rounds 1 & 2):** Players sequentially submit one-word proxy hints. The Django backend uses modulo arithmetic `(current_turn + 1) % 5` to calculate the next turn, automatically incrementing the round once the turn resets to 0.
3. **Open Discussion (Round 3):** After two full rounds of hinting, the strict turn order is removed, and players enter a 60-second free-chat phase to discuss suspicions.
4. **Voting Phase:** Once the discussion timer expires, the game shifts to a 30-second voting phase where players lock in their suspect.

### AI Action Algorithm
The autonomous AI bot dynamically reacts to human players using a multi-step workflow:
1. **Context Gathering:** The Django backend retrieves the current chat history, the AI's assigned role (Crewmate or Imposter), and the secret word from the Supabase database.
2. **Prompt Selection:** Depending on the bot's role and the current game phase (e.g., hinting vs. open discussion), the backend loads a specific instruction template.
3. **Dynamic Context Injection:** The live game data and the AI's player ID are dynamically injected into the base prompt.
4. **LLM Execution:** The assembled prompt is sent to the `gpt-5.4` model via an AI Gateway.
5. **Structured Parsing:** The application forces the LLM to output responses using strict JSON format via Pydantic schemas, ensuring data integrity for word choices and votes.
6. **Execution & Database Insertion:** The parsed response (a proxy word, discussion message, or cast vote) is instantly inserted into the Supabase database, triggering a real-time update to all connected clients.

### Voting Execution Algorithm
The voting phase securely resolves the winner through a synchronized process:
1. **Countdown Sync:** The React client synchronizes with the server's 30-second voting window.
2. **Target Retrieval:** The UI dynamically loads eligible targets from the database, excluding the user themselves.
3. **RPC Execution:** When a vote is locked in, the frontend triggers an atomic `increment_vote` Remote Procedure Call (RPC) directly on the PostgreSQL database to ensure secure tallying.
4. **Resolution:** Upon timer expiration, the backend compares all vote tallies against the assigned Imposter ID to determine the winning team.

## Setup & Installation

### Prerequisites
* Docker and Docker Compose
* Node.js and npm
* Supabase Account / API Keys
* AI Gateway API Key
  
### Compile and Run
* Navigate to backend: 
`docker compose up`
* Navigate to frontend and install dependencies:
`npm install`
* Run the application:
`npm start`

### Link
[outofcontext.vercel.app](https://outofcontext.vercel.app)
