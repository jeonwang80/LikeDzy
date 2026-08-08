import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'visitorStats'), orderBy('__name__', 'desc'), limit(30));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          date: doc.id,
          count: doc.data().count || 0
        }));
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalVisitors = stats.reduce((acc, curr) => acc + curr.count, 0);

  if (loading) return <div style={{ color: '#707072', fontWeight: 'bold' }}>통계 불러오는 중...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">STORE ANALYTICS</span>
          <h1>방문 통계</h1>
          <p>최근 30일 동안 기록된 일별 스토어 방문 데이터를 확인합니다.</p>
        </div>
        <span className="admin-page-count">LAST 30 DAYS</span>
      </div>
      
      <div className="admin-card">
        <h3 style={{ fontSize: '0.9rem', color: '#707072', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>기간 내 총 방문자</h3>
        <p style={{ fontSize: '2.8rem', fontWeight: '800', color: '#111111', margin: '0.4rem 0 0 0', fontFamily: 'var(--font-display, sans-serif)' }}>
          {totalVisitors.toLocaleString()}명
        </p>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>방문자 수</th>
                <th style={{ width: '60%' }}>추이 그래프</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: '#707072' }}>아직 데이터가 없습니다.</td>
                </tr>
              ) : (
                stats.map((stat) => {
                  const maxCount = Math.max(...stats.map(s => s.count), 1);
                  const percent = (stat.count / maxCount) * 100;
                  
                  return (
                    <tr key={stat.date}>
                      <td style={{ fontWeight: '600' }}>{stat.date}</td>
                      <td style={{ fontWeight: '700' }}>{stat.count.toLocaleString()}</td>
                      <td>
                        <div style={{ width: '100%', background: '#f5f5f5', height: '10px', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, background: '#111111', height: '100%', borderRadius: '9999px', transition: 'width 0.5s ease-out' }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
