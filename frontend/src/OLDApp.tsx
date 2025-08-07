import React, { useEffect, useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('http://backend:8000/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error("Error fetching from backend:", err);
        setMessage('Failed to load backend response.');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Astro Cluster Viewer</h1>
      <p>Backend says: {message}</p>
    </div>
  );
};

export default App;
