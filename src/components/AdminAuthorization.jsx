import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const MASTER_ADMIN_EMAIL = 'jeonwang80@gmail.com';

export default function AdminAuthorization() {
  const [adminEmails, setAdminEmails] = useState([MASTER_ADMIN_EMAIL]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data()?.adminEmails)) {
        setAdminEmails(snapshot.data().adminEmails);
      }
    }, (error) => console.error('Error subscribing to admin settings:', error));

    return unsubscribe;
  }, []);

  const handleAddAdminEmail = async (event) => {
    event.preventDefault();
    const normalizedEmail = newAdminEmail.trim().toLowerCase();
    if (!normalizedEmail) return;
    if (!normalizedEmail.includes('@')) {
      alert('올바른 이메일 형식을 입력해 주세요.');
      return;
    }
    if (adminEmails.some((email) => email.toLowerCase() === normalizedEmail)) {
      alert('이미 등록된 어드민 계정입니다.');
      return;
    }

    setSaving(true);
    try {
      const updatedEmails = [...adminEmails, normalizedEmail];
      await setDoc(doc(db, 'settings', 'admin'), { adminEmails: updatedEmails }, { merge: true });
      setAdminEmails(updatedEmails);
      setNewAdminEmail('');
      alert(`[${normalizedEmail}] 계정이 어드민 승인 목록에 추가되었습니다.`);
    } catch (error) {
      console.error('Error adding admin email:', error);
      alert('어드민 계정 추가 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdminEmail = async (emailToDelete) => {
    if (emailToDelete.toLowerCase() === MASTER_ADMIN_EMAIL) {
      alert('마스터 어드민 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`[${emailToDelete}] 계정의 어드민 권한을 해제할까요?`)) return;

    setSaving(true);
    try {
      const updatedEmails = adminEmails.filter((email) => email.toLowerCase() !== emailToDelete.toLowerCase());
      await setDoc(doc(db, 'settings', 'admin'), { adminEmails: updatedEmails }, { merge: true });
      setAdminEmails(updatedEmails);
      alert(`[${emailToDelete}] 계정이 어드민 승인 목록에서 제거되었습니다.`);
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
        <strong>{adminEmails.length} ACCOUNTS</strong>
      </div>

      <p className="admin-authorization-description">
        이곳에 등록된 이메일 계정만 LikeDzy 관리자 페이지에 로그인하고 접근할 수 있습니다.
      </p>

      <form className="admin-authorization-form" onSubmit={handleAddAdminEmail}>
        <input
          type="email"
          value={newAdminEmail}
          onChange={(event) => setNewAdminEmail(event.target.value)}
          placeholder="추가할 어드민 이메일 주소 (예: manager@likedzy.com)"
          className="admin-input"
          required
        />
        <button type="submit" disabled={saving} className="admin-btn-primary">
          {saving ? '처리 중...' : '+ 승인 계정 추가'}
        </button>
      </form>

      <div className="admin-authorization-list">
        {adminEmails.map((email) => {
          const isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL;
          return (
            <div className="admin-authorization-account" key={email}>
              <span className="admin-authorization-avatar">A</span>
              <span>{email}</span>
              {isMaster ? (
                <small>마스터</small>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveAdminEmail(email)}
                  disabled={saving}
                  aria-label={`${email} 승인 해제`}
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
