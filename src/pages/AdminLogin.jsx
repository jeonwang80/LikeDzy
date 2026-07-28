import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/admin');
    } catch (err) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('구글 로그인 실패: Firebase Console에 승인된 도메인(Authorized Domain) 등록이 필요합니다.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('구글 로그인 실패: Firebase Console에서 Google 로그인 제공업체가 활성화되지 않았습니다.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('구글 로그인 창이 닫혔습니다. 다시 시도해 주세요.');
      } else {
        setError(`구글 로그인 실패 (${err.code || err.message})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--admin-soft-cloud, #f5f5f5)', padding: '1.5rem' }}>
      <div style={{ background: '#ffffff', padding: '3rem 2.5rem', border: '1px solid var(--admin-hairline-soft, #e5e5e5)', width: '100%', maxWidth: '420px', boxShadow: 'none' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', color: '#111111', fontFamily: 'var(--admin-font-display, "Bebas Neue", sans-serif)', fontSize: '2.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>LikeDzy</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#707072', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Admin Portal Access</p>
        
        {error && <div style={{ color: '#d30005', background: '#fce8e6', padding: '0.75rem 1rem', borderRadius: '24px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', lineHeight: '1.4', wordBreak: 'keep-all' }}>{error}</div>}
        
        <button 
          disabled={loading} 
          onClick={handleGoogleLogin} 
          className="admin-btn-secondary"
          style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', height: '48px' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '18px', height: '18px' }} />
          구글 계정으로 로그인
        </button>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', color: '#9e9ea0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }}></div>
          <span style={{ padding: '0 0.8rem', fontSize: '0.8rem', fontWeight: '600' }}>또는 이메일 로그인</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }}></div>
        </div>

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
          <button type="submit" disabled={loading} className="admin-btn-primary" style={{ width: '100%', marginTop: '0.5rem', height: '48px' }}>
            {loading ? '로그인 처리 중...' : '이메일 로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
