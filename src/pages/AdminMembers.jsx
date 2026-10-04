import React, { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const getMembers = httpsCallable(functions, 'listMembers');
const dateText = (value) => value ? new Date(value).toLocaleString('ko-KR') : '—';
const providerText = (providers) => providers.map((provider) => ({ 'password': '이메일', 'google.com': 'Google', 'phone': '전화번호' })[provider] || provider).join(', ') || '—';

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [queryEmail, setQueryEmail] = useState('');
  const [pageTokens, setPageTokens] = useState(['']);
  const [nextToken, setNextToken] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);
  const currentToken = pageTokens.at(-1);

  useEffect(() => {
    const id = ++requestId.current;
    getMembers({ pageSize: 50, pageToken: currentToken, email: queryEmail }).then(({ data }) => {
      if (id !== requestId.current) return;
      setMembers(data.members); setNextToken(data.nextPageToken);
    }).catch((failure) => {
      if (id !== requestId.current) return;
      setError(failure.code === 'functions/permission-denied' || failure.code === 'functions/unauthenticated'
        ? '관리자 권한을 확인할 수 없습니다. 이메일 인증 후 다시 로그인해 주세요.'
        : failure.code === 'functions/not-found' ? '가입자 조회 기능이 서버에 배포되지 않았습니다.'
          : failure.code === 'functions/invalid-argument' ? failure.message
            : '가입자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }).finally(() => { if (id === requestId.current) setBusy(false); });
    return () => { requestId.current += 1; };
  }, [currentToken, queryEmail, refresh]);

  const beginLoad = () => { setBusy(true); setError(''); setMembers([]); setNextToken(''); };
  const search = (event) => {
    event.preventDefault(); beginLoad(); setPageTokens(['']); setQueryEmail(email.trim()); setRefresh((value) => value + 1);
  };
  const reset = () => { beginLoad(); setEmail(''); setQueryEmail(''); setPageTokens(['']); setRefresh((value) => value + 1); };

  return <div className="admin-page">
    <div className="admin-page-header"><div><span>MEMBERS</span><h1>가입자 현황</h1><p>가입 계정과 이메일 인증 상태를 확인합니다.</p></div></div>
    <section className="admin-card admin-members-panel">
      <form className="admin-members-search" onSubmit={search}>
        <label className="admin-form-field"><span>이메일 검색 (정확히 일치)</span><input className="admin-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" /></label>
        <button className="admin-btn-primary" disabled={busy} type="submit">조회</button>
        <button className="admin-btn-secondary" disabled={busy} type="button" onClick={reset}>전체 목록 / 새로고침</button>
      </form>
      <p className="admin-members-summary">{busy ? '조회 중…' : error ? '조회 실패' : `현재 조회 ${members.length}명 · 이메일 인증 ${members.filter((member) => member.emailVerified).length}명 · 계정 사용 중 ${members.filter((member) => !member.disabled).length}명`}</p>
      <p>목록은 50명씩 표시됩니다. 위 숫자는 현재 페이지 기준입니다.</p>
    </section>
    <section className="admin-card" aria-label="가입자 목록" aria-busy={busy}>
      {busy ? <p className="admin-members-panel" role="status">가입자 목록을 불러오는 중…</p>
        : error ? <p className="admin-members-panel" role="alert">{error}</p>
          : members.length === 0 ? <p className="admin-members-panel">{queryEmail ? '해당 이메일로 가입한 회원이 없습니다.' : '가입자가 없습니다.'}</p>
            : <div className="admin-table-container"><table className="admin-table admin-members-table"><thead><tr><th scope="col">회원</th><th scope="col">가입 방법</th><th scope="col">가입일</th><th scope="col">최근 로그인</th><th scope="col">이메일 인증</th><th scope="col">계정 상태</th></tr></thead><tbody>{members.map((member) => <tr key={member.uid}>
              <td><strong>{member.displayName || '이름 미등록'}</strong><div>{member.email || '이메일 없음'}</div><small>회원 ID: {member.uid}</small>{member.phoneNumber && <div>{member.phoneNumber}</div>}</td>
              <td>{providerText(member.providers)}</td><td>{dateText(member.createdAt)}</td><td>{dateText(member.lastSignInAt)}</td><td>{member.emailVerified ? '인증 완료' : '미인증'}</td><td>{member.disabled ? '사용 중지' : '사용 중'}</td>
            </tr>)}</tbody></table></div>}
    </section>
    <nav className="admin-members-pagination" aria-label="가입자 목록 페이지">
      <button type="button" className="admin-btn-secondary" disabled={busy || pageTokens.length === 1} onClick={() => { beginLoad(); setPageTokens((tokens) => tokens.slice(0, -1)); }}>이전</button>
      <span>{pageTokens.length} 페이지</span>
      <button type="button" className="admin-btn-secondary" disabled={busy || !nextToken} onClick={() => { beginLoad(); setPageTokens((tokens) => [...tokens, nextToken]); }}>다음</button>
    </nav>
  </div>;
}
