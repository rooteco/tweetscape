export default function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      viewBox='0 0 24 24'
      width='24'
    >
      <path d='M0 0h24v24H0z' fill='none' />
      <path d='M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z' />
    </svg>
  );
}
