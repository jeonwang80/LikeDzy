import { getProductBadges } from '../utils/productPresentation';
import './ProductBadges.css';

export default function ProductBadges({ product, preparing = false, language = 'ko' }) {
  const badges = preparing ? [{ type: 'preparing', label: language === 'ko' ? '상품 준비중' : 'Coming soon' }] : getProductBadges(product);
  if (!badges.length) return null;
  return <div className="product-badges">{badges.map(({ type, label }) => <span key={label} className={`alo-badge-pill product-badge badge-${type}`}>{label}</span>)}</div>;
}
