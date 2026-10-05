import { useId } from 'react';

function Badges({ points }) {
  return points.map(([x, y, n]) => <g key={n}><circle cx={x} cy={y} r="15" fill="#b32632" /><text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{n}</text></g>);
}

function PantsDiagram({ ko }) {
  const marker = useId().replace(/:/g, '');
  return <svg className="sg-diagram" viewBox="0 0 600 570" role="img" aria-label={ko ? '바지 측정 위치: 총장, 허리둘레, 엉덩이둘레, 허벅지둘레, 앞밑위, 밑단둘레' : 'Pants measurement positions: outseam, waist, hips, thigh, front rise and leg opening'}>
    <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="#b32632" /></marker></defs>
    <path d="M190 75H410L433 480L327 492L300 241L273 492L167 480Z" fill="#f2f4f5" stroke="#87929c" strokeWidth="2" />
    <path d="M189 97H411M300 97V212Q301 230 300 241M215 98Q213 145 185 155M385 98Q387 145 415 155M169 466L275 477M325 477L431 466" fill="none" stroke="#b4bdc4" strokeWidth="2" />
    <g fill="none" stroke="#b32632" strokeWidth="2.5" markerStart={`url(#${marker})`} markerEnd={`url(#${marker})`}><path d="M143 76L122 479" /><path d="M310 82V233" /></g>
    <g fill="none" stroke="#b32632" strokeWidth="2.5">
      <path d="M190 82A110 19 0 0 1 410 82M185 173A115 22 0 0 1 415 173M180 278A54 15 0 0 1 288 278M167 481A53 16 0 0 1 273 481" strokeDasharray="7 6" />
      <path d="M410 82A110 19 0 0 1 190 82M415 173A115 22 0 0 1 185 173M288 278A54 15 0 0 1 180 278M273 481A53 16 0 0 1 167 481" markerEnd={`url(#${marker})`} />
    </g>
    <Badges points={[[101,310,'1'],[300,38,'2'],[451,173,'3'],[232,318,'4'],[344,134,'5'],[220,529,'6']]} />
  </svg>;
}

function HatDiagram({ ko }) {
  const marker = useId().replace(/:/g, '');
  return <svg className="sg-diagram" viewBox="0 0 600 450" role="img" aria-label={ko ? '모자 측정 위치: 머리둘레, 모자 높이, 챙 길이' : 'Hat measurement positions: head circumference, crown height and brim length'}>
    <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="#b32632" /></marker></defs>
    <path d="M117 278Q137 105 286 87Q399 75 428 245Q493 260 547 307Q517 345 457 343L310 293Q191 319 117 278Z" fill="#f2f4f5" stroke="#87929c" strokeWidth="2" />
    <path d="M286 87Q214 151 212 293M286 87Q323 167 310 293M117 278Q258 319 428 245M310 293Q384 303 428 245" fill="none" stroke="#b4bdc4" strokeWidth="2" />
    <ellipse cx="287" cy="86" rx="12" ry="5" fill="#87929c" />
    <g fill="none" stroke="#b32632" strokeWidth="2.5">
      <path d="M120 276Q264 229 426 247" strokeDasharray="7 6" />
      <path d="M426 247Q275 330 120 276" markerEnd={`url(#${marker})`} />
      <path d="M101 267Q133 122 269 73M438 263L524 307" markerStart={`url(#${marker})`} markerEnd={`url(#${marker})`} />
    </g>
    <Badges points={[[260,338,'1'],[126,127,'2'],[501,255,'3']]} />
  </svg>;
}

export default function MeasuringDiagram({ type = 'tops', ko }) {
  if (type === 'pants') return <PantsDiagram ko={ko} />;
  if (type === 'hats') return <HatDiagram ko={ko} />;
  return <TopsDiagram ko={ko} />;
}

function TopsDiagram({ ko }) {
  const marker = useId().replace(/:/g, '');
  return <svg className="sg-diagram" viewBox="0 0 600 570" role="img" aria-label={ko ? '티셔츠 측정 위치: 총장, 어깨너비, 가슴둘레, 소매길이, 밑단둘레' : 'T-shirt measurement positions: length, shoulders, chest, sleeve and hem'}>
    <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="#b32632" /></marker></defs>
    <path d="M240 70Q300 108 360 70L420 94L525 224L446 278L405 220L417 485Q300 506 183 485L195 220L154 278L75 224L180 94Z" fill="#f2f4f5" stroke="#87929c" strokeWidth="2" />
    <path d="M240 70Q300 160 360 70M180 94L195 220M420 94L405 220M183 474Q300 493 417 474" fill="none" stroke="#b4bdc4" strokeWidth="2" />
    <g fill="none" stroke="#b32632" strokeWidth="2.5" markerStart={`url(#${marker})`} markerEnd={`url(#${marker})`}>
      <path d="M180 48H420" /><path d="M225 86V482" /><path d="M445 97L546 224" />
    </g>
    <g fill="none" stroke="#b32632" strokeWidth="2.5">
      <path d="M195 254A105 21 0 0 1 405 254M183 470A117 23 0 0 1 417 470" strokeDasharray="7 6" />
      <path d="M405 254A105 21 0 0 1 195 254M417 470A117 23 0 0 1 183 470" markerEnd={`url(#${marker})`} />
    </g>
    {[[206,370,'1'],[300,25,'2'],[300,298,'3'],[527,130,'4'],[300,525,'5']].map(([x,y,n]) => <g key={n}><circle cx={x} cy={y} r="15" fill="#b32632"/><text x={x} y={y+5} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{n}</text></g>)}
  </svg>;
}

