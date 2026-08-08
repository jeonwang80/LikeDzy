import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setSuccessMsg('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch {
      setError('구글 로그인에 실패했습니다.');
    }
    setLoading(false);
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    if (!resetEmail) return setError('이메일을 입력해 주세요.');
    try {
      setError('');
      setSuccessMsg('');
      setLoading(true);
      await resetPassword(resetEmail);
      setSuccessMsg(`[${resetEmail}] 주소로 비밀번호 재설정 이메일이 발송되었습니다.`);
      setIsResetting(false);
    } catch {
      setError('비밀번호 재설정 이메일 발송 실패. 이메일 주소를 확인해주세요.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
          <span>&larr;</span> 쇼핑몰 홈으로
        </button>
      </div>
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', color: 'var(--text-color)' }}>로그인</h2>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}
        {successMsg && <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{successMsg}</div>}
        
        {!isResetting ? (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>이메일</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ color: 'var(--text-muted)' }}>비밀번호</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetting(true); setResetEmail(email); }}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    비밀번호 재설정
                  </button>
                </div>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                />
              </div>
              <button disabled={loading} type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                이메일로 로그인
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-muted)' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.9rem' }}>또는</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <button 
              disabled={loading} 
              onClick={handleGoogleLogin} 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'white', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '18px' }} />
              구글 계정으로 로그인
            </button>

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              아직 계정이 없으신가요? <Link to="/signup" style={{ color: '#60a5fa', textDecoration: 'none', marginLeft: '0.5rem' }}>회원가입</Link>
            </div>
          </>
        ) : (
          <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'white', margin: 0 }}>비밀번호 재설정</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>가입하신 이메일 주소를 입력하시면 비밀번호 변경 링크를 보내드립니다.</p>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>이메일</label>
              <input 
                type="email" 
                required 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsResetting(false)} className="btn-secondary" style={{ flex: 1 }}>취소</button>
              <button disabled={loading} type="submit" className="btn-primary" style={{ flex: 1 }}>전송하기</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
