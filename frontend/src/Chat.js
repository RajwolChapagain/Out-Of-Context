import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 1. Paste your actual Supabase details here
// Find these in: Project Settings -> API
const supabase = createClient(
  'https://ialzxgcgkzvgxjzgglkc.supabase.co', 
  'sb_publishable_RC7ubywKk9G_vz0eiuBlPw_NwGnvuev' 
);

function Chat() {
  const [gameData, setGameData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Join the server via Django
  const joinServer = async () => {
    try {
      const res = await axios.get('https://quantitative-advancement-provincial-belong.trycloudflare.com/join');
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
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button onClick={joinServer} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          Join Server
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h2>Theory of Mind: Game Room</h2>
      <p style={{ fontSize: '10px', color: '#888' }}>Game ID: {gameData.game_id}</p>
      
      {/* Message List Area */}
      <div style={{ 
        border: '1px solid #ccc', 
        height: '350px', 
        overflowY: 'scroll', 
        marginBottom: '10px', 
        padding: '10px',
        borderRadius: '5px',
        background: '#f9f9f9',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>No messages yet. Start the conversation!</p>}
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            textAlign: msg.sender_id === gameData.your_id ? 'right' : 'left',
            margin: '5px 0'
          }}>
            <span style={{ 
              background: msg.sender_id === gameData.your_id ? '#007bff' : '#e9e9eb',
              color: msg.sender_id === gameData.your_id ? 'white' : 'black',
              padding: '8px 12px',
              borderRadius: '15px',
              display: 'inline-block',
              maxWidth: '85%',
              wordWrap: 'break-word'
            }}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '5px' }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..." 
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
