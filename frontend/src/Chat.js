import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 1. Paste your actual Supabase details here
// Find these in: Project Settings -> API
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function Chat() {
  const [gameData, setGameData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Join the server via Django
  const joinServer = async () => {
    try {
      const res = await axios.get('http://localhost:8000/join/');
      setGameData(res.data);
    } catch (err) {
      alert("Backend not reached. Is Docker running?");
    }
  };

  // Real-time Listener: Listen for new messages in this specific game
  useEffect(() => {
    if (!gameData) return;

    // Optional: Fetch existing messages so the chat history loads immediately
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('game_id', gameData.game_id)
        .order('timestamp', { ascending: true });
      if (data) setMessages(data);
    };
    fetchExisting();

    const channel = supabase
      .channel(`game-${gameData.game_id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `game_id=eq.${gameData.game_id}` 
        }, 
        (payload) => {
          // This makes the message appear on the other person's screen!
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameData]);

  // Send Message to Supabase
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // FIX: Use .from() instead of .table()
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          game_id: gameData.game_id,
          sender_id: gameData.your_id, 
          content: inputText
        }
      ]);

    if (error) {
      console.error("Error sending message:", error.message);
    } else {
      setInputText(''); // Clear input on success
    }
  };

  if (!gameData) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#030a16' // dark blue
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
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease'
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Join Server
      </button>
    </div>
  );
}


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
      padding: '15px 20px',
      borderBottom: '1px solid #1f2a44',
      fontWeight: 'bold'
    }}>
      Theory of Mind — Game Room
      <span style={{ fontSize: '12px', color: '#8aa0c8', marginLeft: '10px' }}>
        ID: {gameData.game_id}
      </span>
    </div>

    {/* Main content */}
    <div style={{ flex: 1, display: 'flex' }}>

      {/* LEFT: Players panel (placeholder for now) */}
      <div style={{
        width: '220px',
        borderRight: '1px solid #1f2a44',
        padding: '15px'
      }}>
        <h3 style={{ marginTop: 0 }}>Players</h3>

        {/* Temporary fake players until backend provides */}
        <div style={{ color: '#9fb3d9', fontSize: '14px', lineHeight: '1.8' }}>
          You<br/>
          Waiting...
        </div>
      </div>

      {/* RIGHT: Chat area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '15px'
      }}>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '10px',
          paddingRight: '5px'
        }}>
          {messages.length === 0 && (
            <p style={{ color: '#6f85b3', textAlign: 'center' }}>
              No messages yet. Start the conversation!
            </p>
          )}

          {messages.map((msg, index) => (
            <div key={index} style={{
              textAlign: msg.sender_id === gameData.your_id ? 'right' : 'left',
              margin: '6px 0'
            }}>
              <span style={{
                background: msg.sender_id === gameData.your_id ? '#2563eb' : '#1f2a44',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '14px',
                display: 'inline-block',
                maxWidth: '70%',
                wordWrap: 'break-word'
              }}>
                {msg.content}
              </span>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
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

export default Chat;