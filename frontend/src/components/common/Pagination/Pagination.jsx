import styles from './styles/Pagination.module.css';

function Pagination({ count, page, pageSize = 20, onPage }) {
  const totalPages = Math.ceil(count / pageSize); // Calculate total pages based on count and pageSize

  if (totalPages <= 1) return null; // Don't render pagination if there's only one page

  const pages = [];
  const start = Math.max(1, page - 2);  // Show up to 2 pages before current page, but not less than 1

  const end   = Math.min(totalPages, page + 2);  // Show up to 2 pages after current page, but not more than totalPages

  for (let i = start; i <= end; i++) pages.push(i); // Generate page numbers to display

  return (
    <div className={styles.pagination} role="navigation" aria-label="Pagination">
      <span className={styles.info}>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} of {count}
      </span>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous">‹</button>
        {start > 1 && <><button className={styles.btn} onClick={() => onPage(1)}>1</button><span className={styles.ellipsis}>…</span></>}
        {pages.map(p => (
          <button
            key={p}
            className={`${styles.btn} ${p === page ? styles.active : ''}`}
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
          >{p}</button>
        ))}
        {end < totalPages && <><span className={styles.ellipsis}>…</span><button className={styles.btn} onClick={() => onPage(totalPages)}>{totalPages}</button></>}
        <button className={styles.btn} onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Next">›</button>
      </div>
    </div>
  );
}

export default Pagination;