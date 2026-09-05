import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { BOOTSTRAP_ADMIN_EMAIL } from '../utils/adminAccess';


export default function AdminAuthorization() {
  const { currentUser } = useAuth();
  const [adminUids, setAdminUids] = useState([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (snapshot) => {
      setAdminUids(snapshot.exists() && Array.isArray(snapshot.data()?.adminUids) ? snapshot.data().adminUids : []);
    }, () => setError('관리자 승인 목록을 불러올 수 없습니다.'));

    return unsubscribe;
  }, []);

  const handleAddAdminUid = async (event) => {
    event.preventDefault();
    const uid = newAdminUid.trim();
    if (!uid) return;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
      alert('등록된 계정의 정확한 Firebase UID를 입력해 주세요.');
      return;
    }
    if (adminUids.includes(uid)) {
      alert('이미 등록된 어드민 계정입니다.');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'admin'), { adminUids: arrayUnion(uid), updatedAt: serverTimestamp() }, { merge: true });
      setNewAdminUid('');
      alert('UID가 승인 목록에 추가되었습니다. 해당 계정은 이메일 인증 후 다시 로그인해야 합니다.');
    } catch (error) {
      console.error('Error adding admin email:', error);
      alert('어드민 계정 추가 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdminUid = async (uid) => {
    if (uid === currentUser?.uid) {
      alert('현재 로그인한 본인의 권한은 이 화면에서 해제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`[${uid}] 계정의 어드민 권한을 해제할까요?`)) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'admin'), { adminUids: arrayRemove(uid), updatedAt: serverTimestamp() }, { merge: true });
      alert('UID 승인 권한을 해제했습니다. 별도 서버 관리자 권한이 설정된 계정은 서버 권한도 해제해야 합니다.');
    } catch (error) {
      console.error('Error removing admin email:', error);
      alert('어드민 계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-card admin-authorization-card">
      <div className="admin-authorization-header">
        <div>
          <span>ADMIN AUTHORIZATION</span>
          <h2>어드민 승인 계정 관리</h2>
        </div>
        <strong>{adminUids.length} UID ACCOUNTS</strong>
      </div>

      <p className="admin-authorization-description">
        이메일 주소를 승인하는 대신 등록된 계정의 고유 UID를 승인합니다. Firebase 인증 사용자 목록에서 이메일 인증 여부와 UID를 확인한 후 등록하세요. 이메일 인증을 완료하지 않은 계정에는 권한이 부여되지 않습니다.
      </p>
      <p className="admin-inline-notice">초기 소유자: {BOOTSTRAP_ADMIN_EMAIL} (이메일 인증 필수) · 내 UID: {currentUser?.uid}</p>
      {error && <p role="alert">{error}</p>}

      <form className="admin-authorization-form" onSubmit={handleAddAdminUid}>
        <input
          type="text"
          value={newAdminUid}
          maxLength={128}
          onChange={(event) => setNewAdminUid(event.target.value)}
          placeholder="추가할 관리자 계정 UID"
          className="admin-input"
          required
        />
        <button type="submit" disabled={saving} className="admin-btn-primary">
          {saving ? '처리 중...' : '+ 승인 계정 추가'}
        </button>
      </form>

      <div className="admin-authorization-list">
        {adminUids.map((uid) => {
          const isSelf = uid === currentUser?.uid;
          return (
            <div className="admin-authorization-account" key={uid}>
              <span className="admin-authorization-avatar">A</span>
              <span>{uid}</span>
              {isSelf ? (
                <small>내 계정</small>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveAdminUid(uid)}
                  disabled={saving}
                  aria-label={`${uid} 승인 해제`}
                  title="어드민 권한 해제"
                >
                  &times;
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
