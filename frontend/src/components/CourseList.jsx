import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    axios.get(`${API}/api/courses`, { withCredentials: true })
      .then(r => setCourses(r.data))
      .catch(e => console.error(e));
  }, []);
  return (
    <div>
      <h2>Courses</h2>
      <ul>
        {courses.map(c => <li key={c.id}>{c.code} — {c.name}</li>)}
      </ul>
    </div>
  );
}
