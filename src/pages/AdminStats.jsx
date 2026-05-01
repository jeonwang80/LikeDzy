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

  if (loading) return <div style={{ color: '#94a3b8' }}>통계 불러오는 중...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f1f5f9' }}>방문자 통계 (최근 30일)</h2>
      
      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '0.5rem', margin: 0 }}>기간 내 총 방문자</h3>
        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', margin: '0.5rem 0 0 0' }}>{totalVisitors.toLocaleString()}명</p>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#334155', color: '#f8fafc' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>날짜</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>방문자 수</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569', width: '60%' }}>추이 그래프</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>아직 데이터가 없습니다.</td>
              </tr>
            ) : (
              stats.map((stat) => {
                const maxCount = Math.max(...stats.map(s => s.count), 1);
                const percent = (stat.count / maxCount) * 100;
                
                return (
                  <tr key={stat.date} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>{stat.date}</td>
                    <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 'bold' }}>{stat.count.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ width: '100%', background: '#334155', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, background: '#3b82f6', height: '100%', borderRadius: '6px', transition: 'width 0.5s ease-out' }}></div>
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
  );
}
