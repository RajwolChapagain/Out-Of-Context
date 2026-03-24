import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import Voting from './Voting';

const supabase = createClient(
  'https://ialzxgcgkzvgxjzgglkc.supabase.co',
  'sb_publishable_RC7ubywKk9G_vz0eiuBlPw_NwGnvuev'
);

function Chat() {
  const [gameData, setGameData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showVoting, setShowVoting] = useState(false);
  const [role, setRole] = useState("Crewmate");
  const [gameOver, setGameOver] = useState(false);
  const [myTurnID, setMyTurnID] = useState(-1);
  const [currentTurn, setCurrentTurn] = useState(-1);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [round, setRound] = useState(1);
  const [playerMap, setPlayerMap] = useState({});
  const [word, setWord] = useState(null);
  const [meetingOpen, setMeetingOpen] = useState(false);

  // NEW: discussion state only
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [discussionInput, setDiscussionInput] = useState('');
  const [discussionMessages, setDiscussionMessages] = useState([]);

  const syncTurnData = useCallback(async (gameId, userId, retryCount = 0) => {
    const { data: player } = await supabase
      .from('players')
      .select('turn_order')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single();

    const { data: game } = await supabase
      .from('games')
      .select('current_turn, status, current_round')
      .eq('game_id', gameId)
      .single();

    if (game) {
      setCurrentTurn(game.current_turn);
      setGameStatus(game.status);
      setRound(game.current_round || 1);
    }

    if (!player || player.turn_order === null || player.turn_order === -1) {
      if (retryCount < 10) {
        console.log("Sync: Data not ready, retrying...");
        setTimeout(() => syncTurnData(gameId, userId, retryCount + 1), 500);
      }
      return;
    }

    setMyTurnID(player.turn_order);

    if (game) {
      setCurrentTurn(game.current_turn);
      setGameStatus(game.status);
    }
  }, []);

  const joinServer = async () => {
    try {
      const res = await axios.get('http://localhost:8000/join');
      setGameData(res.data);
      setGameStatus(res.data.status);

      if (res.data.status === 'active') {
        syncTurnData(res.data.game_id, res.data.your_id);
      }
    } catch (err) {
      alert("Backend error.");
    }
  };

  useEffect(() => {
    if (!gameData) return;

    const fetchExisting = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('game_id', gameData.game_id)
        .order('timestamp', { ascending: true });
      if (data) setMessages(data);
    };

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('user_id, turn_order, Imposter')
        .eq('game_id', gameData.game_id);

      if (data) {
        const map = {};
        data.forEach(p => {
          map[p.user_id] = p.turn_order;
          if (p.user_id === gameData.your_id) {
            setRole(p.Imposter ? "Imposter" : "Crewmate");
          }
        });
        setPlayerMap(map);
      }
    };

    const fetchGameWord = async () => {
      const { data } = await supabase
        .from('games')
        .select('word')
        .eq('game_id', gameData.game_id)
        .single();

      if (data?.word) {
        setWord(data.word);
      }
    };

    fetchExisting();
    fetchPlayers();
    fetchGameWord();

    const channel = supabase
      .channel(`game-${gameData.game_id}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `game_id=eq.${gameData.game_id}` 
        }, (payload) => setMessages((prev) => [...prev, payload.new]))
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'games', 
          filter: `game_id=eq.${gameData.game_id}` 
        }, (payload) => {
          setGameStatus(payload.new.status);
          setCurrentTurn(payload.new.current_turn);
          if (payload.new.word) {
            setWord(payload.new.word);
          }
          const currentRound = payload.new.current_round || 1;
          setRound(currentRound);

          // CHANGED: show discussion panel instead of going straight to voting
          if (currentRound > 2) {
            setGameOver(true);
            setShowDiscussion(true);
          }

          if (payload.new.status === 'active') {
            syncTurnData(gameData.game_id, gameData.your_id);
            fetchPlayers(); 
          }
        })
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'players', 
          filter: `game_id=eq.${gameData.game_id}` 
        }, (payload) => {
          if (payload.new.user_id === gameData.your_id) {
            setRole(payload.new.Imposter ? "Imposter" : "Crewmate");
            setMyTurnID(payload.new.turn_order);
          }
          setPlayerMap(prev => ({
            ...prev,
            [payload.new.user_id]: payload.new.turn_order
          }));
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameData, syncTurnData]);

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    try {
      await axios.post('http://localhost:8000/send_message', {
        game_id: gameData.game_id,
        player_id: gameData.your_id,
        content: inputText
      });

      setInputText('');

    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Is the backend running?");
    }
  };

  // NEW: local-only discussion messages (no backend needed)
  const sendDiscussionMessage = (e) => {
    e.preventDefault();
    if (!discussionInput.trim()) return;
    const playerNumber = playerMap[gameData.your_id];
    setDiscussionMessages(prev => [...prev, {
      sender: `Player ${playerNumber + 1} (You)`,
      content: discussionInput.trim(),
      isMe: true
    }]);
    setDiscussionInput('');
  };

  const isLobby = gameStatus === 'waiting';
  const isMyTurn = gameStatus === 'active' && myTurnID === currentTurn;
  const inputDisabled = !isLobby && !isMyTurn;

  if (!gameData) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#030a16'
        }}
      >
        <button
          onClick={joinServer}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            cursor: 'pointer',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '12px'
          }}
        >
          Join Server
        </button>
      </div>
    );
  }

  if (showVoting) {
    return (
      <Voting 
        gameId={gameData.game_id} 
        myId={gameData.your_id} 
        onClose={() => setShowVoting(false)} 
      />
    );
  }

  // NEW: Discussion panel — full-screen replacement after round 2, before voting
  if (showDiscussion) {
    return (
      <div style={{
        height: '100vh',
        background: '#030a16',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial'
      }}>
        {/* Header */}
        <div style={{
          padding: '15px 24px',
          borderBottom: '1px solid #1f2a44',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '22px' }}>🗣️</span>
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Discussion Phase</span>
          <span style={{ fontSize: '13px', color: '#8aa0c8', marginLeft: 'auto' }}>
            Two rounds complete — discuss before voting
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '220px',
            borderRight: '1px solid #1f2a44',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: '#111a2e', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8aa0c8', marginBottom: '4px' }}>YOUR ROLE</div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: role === 'Imposter' ? '#ef4444' : '#22c55e'
              }}>
                {role}
              </div>
            </div>

            <div style={{ background: '#111a2e', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8aa0c8', marginBottom: '4px' }}>THE WORD WAS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>
                {role === 'Imposter'
                  ? <span style={{ color: '#ef4444' }}>???</span>
                  : word || '...'}
              </div>
            </div>

            <button
              onClick={() => {
                setShowDiscussion(false);
                setShowVoting(true);
              }}
              style={{
                marginTop: 'auto',
                padding: '16px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)'
              }}
            >
              🗳️ Go to Voting
            </button>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{
              background: '#111a2e',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#8aa0c8'
            }}>
              💬 Free discussion — no turn order. Who do you think the Imposter is?
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
              {/* Read-only game recap */}
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', textAlign: 'center' }}>
                — Game Chat Recap —
              </div>
              {messages.map((msg, i) => {
                const playerNumber = playerMap[msg.sender_id];
                const isMe = msg.sender_id === gameData.your_id;
                return (
                  <div key={i} style={{ textAlign: isMe ? 'right' : 'left', margin: '8px 0' }}>
                    <div style={{ fontSize: '11px', color: '#8aa0c8', marginBottom: '2px' }}>
                      {isMe ? 'You' : playerNumber !== undefined ? `Player ${playerNumber + 1}` : 'Player'}
                    </div>
                    <span style={{
                      background: isMe ? '#1e3a5f' : '#1f2a44',
                      padding: '8px 12px',
                      borderRadius: '14px',
                      display: 'inline-block',
                      opacity: 0.7
                    }}>
                      {msg.content}
                    </span>
                  </div>
                );
              })}

              {/* Live discussion messages */}
              {discussionMessages.length > 0 && (
                <div style={{ fontSize: '11px', color: '#475569', margin: '12px 0 8px', textAlign: 'center' }}>
                  — Discussion —
                </div>
              )}
              {discussionMessages.map((msg, i) => (
                <div key={i} style={{ textAlign: msg.isMe ? 'right' : 'left', margin: '8px 0' }}>
                  <div style={{ fontSize: '11px', color: '#8aa0c8', marginBottom: '2px' }}>
                    {msg.sender}
                  </div>
                  <span style={{
                    background: msg.isMe ? '#4f46e5' : '#1e293b',
                    border: msg.isMe ? '1px solid #6366f1' : '1px solid #334155',
                    padding: '8px 12px',
                    borderRadius: '14px',
                    display: 'inline-block'
                  }}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>

            {/* Discussion input */}
            <form onSubmit={sendDiscussionMessage} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={discussionInput}
                onChange={e => setDiscussionInput(e.target.value)}
                placeholder="Share your suspicions..."
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0 20px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Original game UI — completely unchanged from your version
  return (
    <div
      style={{
        height: '100vh',
        background: '#030a16',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial',
        position: 'relative',
        overflow: 'scroll'
      }}
    >
      <div
        style={{
          padding: '15px 20px',
          borderBottom: '1px solid #1f2a44',
          fontWeight: 'bold'
        }}
      >
        Theory of Mind — {isLobby ? 'Lobby' : 'Game Room'}

        <span
          style={{
            fontSize: '12px',
            color: '#8aa0c8',
            marginLeft: '10px'
          }}
        >
          ID: {gameData.game_id}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        <div
          style={{
            width: '260px',
            borderRight: '1px solid #1f2a44',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}
        >
          <div
            style={{
              background: '#111a2e',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11px', color: '#8aa0c8' }}>
              YOUR IDENTITY
            </div>

            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {myTurnID === -1
                ? "Assigning..."
                : `Player ${myTurnID + 1}`}
            </div>
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1f2a44',
              borderRadius: '10px',
              padding: '15px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '12px', color: '#8aa0c8' }}>
              YOUR ROLE
            </div>

            <div
              style={{
                marginTop: '6px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: role === "Imposter" ? '#ef4444' : '#22c55e'
              }}
            >
              {role}
            </div>
          </div>

          <div
            style={{
              background: '#111a2e',
              border: '1px solid #2a3a5f',
              borderRadius: '12px',
              padding: '25px 10px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#8aa0c8',
                marginBottom: '8px'
              }}
            >
              Your Word
            </div>

            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                letterSpacing: '2px'
              }}
            >
              {gameStatus !== "active" ? "???" : role === "Imposter" ? "???" : word || "Loading..."}
            </div>
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#9fb3d9',
              textAlign: 'center'
            }}
          >
            {!isLobby && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#8aa0c8',
                  marginBottom: '4px'
                }}
              >
                Round {round}
              </div>
            )}

            {isLobby
              ? "Waiting for players..."
              : isMyTurn
                ? "🟢 YOUR TURN"
                : `Player ${currentTurn + 1}'s Turn`}
          </div>

          <button
            onClick={() => setMeetingOpen(true)}
            style={{
              marginTop: '20px',
              padding: '20px',
              background: '#b91c1c',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '140px',
              height: '140px',
              margin: '20px auto',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(185, 28, 28, 0.4)'
            }}
          >
            EMERGENCY MEETING
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '15px',
            position: 'relative'
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
            {messages.map((msg, i) => {
              const playerNumber = playerMap[msg.sender_id];

              return (
                <div
                  key={i}
                  style={{
                    textAlign: msg.sender_id === gameData.your_id ? 'right' : 'left',
                    margin: '10px 0'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8aa0c8',
                      marginBottom: '2px'
                    }}
                  >
                    {msg.sender_id === gameData.your_id
                      ? "You"
                      : playerNumber !== undefined ? `Player ${playerNumber + 1}` : "Player"}
                  </div>

                  <span
                    style={{
                      background: msg.sender_id === gameData.your_id ? '#2563eb' : '#1f2a44',
                      padding: '8px 12px',
                      borderRadius: '14px',
                      display: 'inline-block'
                    }}
                  >
                    {msg.content}
                  </span>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={sendMessage}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputDisabled ? "Wait for your turn..." : "Type a message..."}
              disabled={inputDisabled}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: inputDisabled ? '#1e293b' : '#fff'
              }}
            />

            <button
              type="submit"
              disabled={inputDisabled}
              style={{
                padding: '0 20px',
                background: inputDisabled ? '#334155' : '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {meetingOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#ef4444', fontSize: '48px' }}>
              🚨 MEETING CALLED
            </h1>

            <button
              onClick={() => setMeetingOpen(false)}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;