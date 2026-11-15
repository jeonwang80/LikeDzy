const SALES_COUNTRIES = [
  { code: 'KR', label: '한국' },
  { code: 'VN', label: '베트남' },
  { code: 'HU', label: '헝가리' },
];

export default function SalesCountryCheckboxes({ value, onChange, disabled = false, productName = '' }) {
  return (
    <fieldset className="admin-sales-countries" disabled={disabled}>
      <legend>{productName ? `${productName} 판매 국가` : '판매 국가'}</legend>
      <div>
        {SALES_COUNTRIES.map(({ code, label }) => (
          <label key={code}>
            <input type="checkbox" checked={value.includes(code)} onChange={event => onChange(
              event.target.checked ? [...value, code] : value.filter(country => country !== code)
            )} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {value.length === 0 && <small>판매 국가 미선택</small>}
    </fieldset>
  );
}
