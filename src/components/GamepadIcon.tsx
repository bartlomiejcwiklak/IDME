export default function GamepadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152L2 17a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1l1-3h10l1 3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1l-.685-8.258c-.007-.051-.011-.1-.017-.152A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}
