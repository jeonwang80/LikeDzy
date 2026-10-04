const { CommerceError } = require('./commerce');

const publicMember = (user) => ({
  uid: user.uid,
  email: user.email || '',
  displayName: user.displayName || '',
  phoneNumber: user.phoneNumber || '',
  emailVerified: user.emailVerified === true,
  disabled: user.disabled === true,
  createdAt: user.metadata?.creationTime || null,
  lastSignInAt: user.metadata?.lastSignInTime || null,
  providers: [...new Set((user.providerData || []).map((provider) => provider.providerId))],
});

function createMemberService({ auth, isAdmin }) {
  return async function listMembers(data = {}, context = {}) {
    if (!context.auth?.uid) throw new CommerceError('unauthenticated', '관리자 로그인이 필요합니다.');
    if (!await isAdmin(context)) throw new CommerceError('permission-denied', '가입자 조회는 인증된 관리자만 가능합니다.');
    const pageSize = data?.pageSize ?? 50;
    const pageToken = data?.pageToken;
    const email = typeof data?.email === 'string' ? data.email.trim() : '';
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
      || (pageToken !== undefined && (typeof pageToken !== 'string' || pageToken.length > 2048))
      || (data?.email !== undefined && typeof data.email !== 'string')) {
      throw new CommerceError('invalid-argument', '조회 조건을 확인해 주세요.');
    }
    if (email) {
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CommerceError('invalid-argument', '검색할 이메일 주소를 정확히 입력해 주세요.');
      try { return { members: [publicMember(await auth.getUserByEmail(email))], nextPageToken: '' }; }
      catch (error) {
        if (error.code === 'auth/user-not-found') return { members: [], nextPageToken: '' };
        throw error;
      }
    }
    try {
      const result = await auth.listUsers(pageSize, pageToken || undefined);
      return { members: result.users.map(publicMember), nextPageToken: result.pageToken || '' };
    } catch (error) {
      if (error.code === 'auth/invalid-page-token') throw new CommerceError('invalid-argument', '조회 페이지가 만료되었습니다. 목록을 새로고침해 주세요.');
      throw error;
    }
  };
}

module.exports = { createMemberService };
