import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

export default function CourseCreate({ onCreated }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/api/courses`, { name, code }, { withCredentials: true });
      setName(""); setCode("");
      if (onCreated) onCreated(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Create failed");
    }
  };

  return (
    <form onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name" required />
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" required />
      <button type="submit">Create</button>
    </form>
  );
}
