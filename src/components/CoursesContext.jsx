import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const CoursesContext = createContext();
export const useCourses = () => useContext(CoursesContext);

const FALLBACK = [
  { id: 'f1', code: 'CS101', name: 'Intro to CS' },
  { id: 'f2', code: 'MATH01', name: 'Calculus I' },
];

export function CoursesProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const res = await api.get('/courses');
        const data = Array.isArray(res.data) ? res.data : [];
        if (mounted) setCourses(data.length ? data : FALLBACK);
      } catch {
        if (mounted) setCourses(FALLBACK);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const createCourse = async (c) => {
    try {
      const res = await api.post('/courses', c);
      setCourses(prev => [...prev, res.data]);
      return res.data;
    } catch {
      const created = { id: 'f-'+Date.now(), ...c };
      setCourses(prev => [...prev, created]);
      return created;
    }
  };

  return <CoursesContext.Provider value={{ courses, loading, createCourse }}>{children}</CoursesContext.Provider>;
}

