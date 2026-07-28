import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', padding: '1rem' }}>
      <div style={{ background: '#ffffff', padding: '3rem 2.5rem', border: '1px solid #e5e5e5', width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', color: '#111111', fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)', fontSize: '2.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>LikeDzy</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#707072', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Admin Portal Access</p>
        
        {error && <div style={{ color: '#d30005', background: '#fce8e6', padding: '0.75rem 1rem', borderRadius: '24px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#39393b', fontSize: '0.85rem', fontWeight: '600' }}>이메일</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="admin-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#39393b', fontSize: '0.85rem', fontWeight: '600' }}>비밀번호</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="admin-input"
            />
          </div>
          <button type="submit" className="admin-btn-primary" style={{ width: '100%', marginTop: '0.75rem' }}>
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
