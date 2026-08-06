import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError('로그인 실패: 아이디 또는 비밀번호를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('재설정 이메일 주소를 입력해 주세요.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setSuccessMsg(`[${resetEmail}] 주소로 비밀번호 재설정 이메일이 발송되었습니다. 이메일 수신함을 확인해 주세요.`);
      setIsResetting(false);
    } catch (err) {
      console.error("Reset password error:", err);
      setError('비밀번호 재설정 실패: 가입된 이메일 주소인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--admin-soft-cloud, #f5f5f5)', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0 }}
        >
          ← 쇼핑몰 홈으로 돌아가기
        </button>
      </div>

      <div style={{ background: '#ffffff', padding: '2.5rem 2rem', border: '1px solid var(--admin-hairline-soft, #e5e5e5)', width: '100%', maxWidth: '420px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', color: '#111111', fontFamily: 'var(--admin-font-display, "Bebas Neue", sans-serif)', fontSize: '2.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>LikeDzy</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.75rem', color: '#707072', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Admin Portal Access</p>
        
        {error && <div style={{ color: '#d30005', background: '#fce8e6', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', lineHeight: '1.4' }}>{error}</div>}
        {successMsg && <div style={{ color: '#15803d', background: '#dcfce7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', lineHeight: '1.4' }}>{successMsg}</div>}
        
        {!isResetting ? (
          <>
            <button 
              disabled={loading} 
              onClick={handleGoogleLogin} 
              className="admin-btn-secondary"
              style={{ width: '100%', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', height: '46px', borderRadius: '8px' }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '18px', height: '18px' }} />
              구글 계정으로 로그인
            </button>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', color: '#9e9ea0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }}></div>
              <span style={{ padding: '0 0.8rem', fontSize: '0.8rem', fontWeight: '600' }}>또는 이메일 로그인</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }}></div>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#39393b', fontSize: '0.85rem', fontWeight: '600' }}>이메일</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="admin-input"
                  placeholder="admin@likedzy.com"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ color: '#39393b', fontSize: '0.85rem', fontWeight: '600' }}>비밀번호</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetting(true); setResetEmail(email); }}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                  >
                    🔑 비밀번호를 잊으셨나요?
                  </button>
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="admin-input"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className="admin-btn-primary" style={{ width: '100%', marginTop: '0.5rem', height: '46px', borderRadius: '8px' }}>
                {loading ? '로그인 처리 중...' : '이메일 로그인'}
              </button>
            </form>
          </>
        ) : (
          /* 비밀번호 재설정 폼 */
          <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>🔑 비밀번호 재설정 이메일 발송</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              가입하신 이메일 주소를 입력해 주시면 재설정 링크를 보내드립니다.
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', color: '#39393b', fontSize: '0.85rem', fontWeight: '600' }}>이메일 주소</label>
              <input 
                type="email" 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                required 
                className="admin-input"
                placeholder="admin@likedzy.com"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setIsResetting(false)} 
                className="admin-btn-secondary"
                style={{ flex: 1, height: '44px', borderRadius: '8px' }}
              >
                취소
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="admin-btn-primary"
                style={{ flex: 2, height: '44px', borderRadius: '8px' }}
              >
                {loading ? '전송 중...' : '재설정 메일 발송'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
