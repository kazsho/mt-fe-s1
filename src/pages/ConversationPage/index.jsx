/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { AudioInput, Message } from "../../components";

function ConversationPage() {
  const [conversation, setConversation] = useState([]);
  const { id } = useParams();

  function addMessageToConversation(messageObject) {
    setConversation((prev) => [...prev, messageObject]);
  }

  function mockInitialGreeting() {
    const mockGreetingMessage = {
      role: "assistant",
      messages: {
        gpt_response_english: "Hello, welcome to your language learning app! What would you like to do today: practice a conversation, explore vocabularly, or test your pronunciation?",
      },
      // The audio file is in `Public/audio/mockk_static_audio.mp3`
      audio: "/audio/mock_static_audio.mp3",
    }
    addMessageToConversation(mockGreetingMessage);
  }

  useEffect(() => {
    console.log(import.meta.env.VITE_BACKEND_URL);
    // Make a generic request to the backend to wake up the server
    (async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + "/");
        if (response.status === 200) console.log("Server is available!");
      } catch (error) {
        console.error("Error checking server availability:", error);
      }
    })();
    mockInitialGreeting();
  }, []);

  useEffect(() => {
    // Store the conversation ID and timestamp in local storage
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    const updatedRecentlyViewed = [{ id, timestamp: Date.now() }, ...recentlyViewed.filter(entry => entry.id !== id)].slice(0, 5);
    localStorage.setItem('recentlyViewed', JSON.stringify(updatedRecentlyViewed));
  }, [id]);


  function base64ToBlob(base64, type) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  }

  async function sendAudioToServer(audioChunks) {
    // Prepare the audio data to send to the server
    const audioBlob = new Blob(audioChunks, { type: "audio/flac" }); // Could change this, but it works so far
    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      console.log("Sending audio to server...");
      const response = await fetch(
        import.meta.env.VITE_BACKEND_URL + "/receive",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();

      console.log("data:", data);

      // Add the returned data to the conversation array
      const userMessage = {
        role: "user",
        messages: {
          user_message_english: data.modelTranscription.user_message_english,
        },
        audio: URL.createObjectURL(base64ToBlob(data.userAudio, "audio/mpeg")),
      };

      const modelMessage = {
        role: "assistant",
        messages: {
          gpt_response_english: data.modelTranscription.gpt_response_english ? data.modelTranscription.gpt_response_english : "N/A",
          gpt_response: data.modelTranscription.gpt_response,
          gpt_response_breakdown: data.modelTranscription.gpt_response_breakdown ? data.modelTranscription.gpt_response_breakdown : "N/A",
          suggestions: data.modelTranscription.suggestions ? data.modelTranscription.suggestions : "N/A",
        },
        audio: URL.createObjectURL(base64ToBlob(data.modelAudio, "audio/mpeg")),
      };

      addMessageToConversation(userMessage);
      addMessageToConversation(modelMessage);
    } catch (error) {
      console.error("Error sending audio to server:", error);
    }
  }

  return (
    <main className="m-10 flex flex-col items-center gap-10">

      <nav className="w-full flex justify-start">
        <NavLink to="/dashboard">
          <span className="flex pl-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            <svg id="icon-keyboard_arrow_left" viewBox="0 0 24 24" className="w-6 fill-white">
              <path d="M15.422 16.594l-1.406 1.406-6-6 6-6 1.406 1.406-4.594 4.594z"></path>
            </svg>
            Dashboard
          </span>
        </NavLink>
      </nav>
      
      <h1>Mother Tongue</h1>
      <h2>Instructions</h2>
      <p>
        Welcome to Mother Tongue! A tool to help you learn and practice your Gujarati. Start by saying hello and have fun!
      </p>

      {conversation
        .filter((item) => item.role !== "system") // Exclude 'system' messages
        .map((item, index) => (
          <Message key={index} data={item} />
        ))}

      <AudioInput sendAudioToServer={sendAudioToServer} />
    </main>
  );
}

export default ConversationPage;
